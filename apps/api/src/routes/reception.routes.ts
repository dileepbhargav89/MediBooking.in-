/**
 * Front-Desk Receptionist Routes
 * Optimized for rapid walk-in intake (<15 seconds) and multi-doctor chamber queue orchestration
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/tenant-context';
import {
  UserRole,
  StaffScope,
  AppointmentStatus,
  BookingSource,
  PaymentStatus,
  PaymentMode,
  TriageSeverity,
  QuickIntakeDTO,
  QueueAppointmentItem,
  ChamberQueueDetail,
  ClinicQueueMetrics,
  MultiChamberQueueResponse,
  ChamberTVState,
} from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';
import { realtimeStreamManager } from '../services/realtime-sse';
import { appointmentService } from '../services/appointment-service';
import { cashieringService } from '../services/cashiering-service';
import { sessionService } from '../services/session-service';
import { queueTransitionController } from '../services/queue-transition-controller';
import { offlineSyncService } from '../services/offline-sync-service';
import { thermalReceiptService } from '../services/thermal-receipt-service';

const intakeSchema = z.object({
  clinicId: z.string().uuid(),
  doctorId: z.string().uuid(),
  chamberNumber: z.string(),
  patientName: z.string().min(2),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  ageYears: z.number().int().min(0).max(125).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).optional(),
  locality: z.string().optional(),
  triageSeverity: z.nativeEnum(TriageSeverity).optional().default(TriageSeverity.ROUTINE),
  paymentMethod: z.enum([
    PaymentStatus.PAID_CASH,
    PaymentStatus.PAID_UPI_QR,
    PaymentStatus.PENDING_AT_DESK,
    PaymentStatus.WAIVED_BY_DOCTOR,
  ]),
  amountRupees: z.number().positive().optional(),
  allowDuplicate: z.boolean().optional().default(false),
  emergencyOverride: z.boolean().optional().default(false),
});

const offlineIntakeItemSchema = z.object({
  clientOfflineId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
  offlineRecordedAt: z.string(),
  patientName: z.string().min(2),
  patientPhone: z.string(),
  patientAge: z.number().int().min(0).max(125),
  patientGender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  doctorId: z.string().uuid(),
  chamberNumber: z.string(),
  paymentMode: z.nativeEnum(PaymentMode),
  amount: z.number().min(0),
  triageSeverity: z.nativeEnum(TriageSeverity).optional(),
  notes: z.string().optional(),
});

const batchSyncSchema = z.object({
  clinicId: z.string().uuid(),
  batchId: z.string().min(1),
  syncedAt: z.string(),
  intakes: z.array(offlineIntakeItemSchema),
});

// In-memory queue state for active appointments
const inMemoryAppointments: Array<{
  id: string;
  clinicId: string;
  doctorId: string;
  chamberNumber: string;
  tokenNumber: number;
  patientName: string;
  patientMobile: string;
  status: AppointmentStatus;
  source: BookingSource;
  paymentStatus: PaymentStatus;
  triageSeverity: TriageSeverity;
  amountRupees: number;
  createdAt: string;
}> = [
  {
    id: 'apt-001',
    clinicId: SEED_DATA.clinic.id,
    doctorId: SEED_DATA.doctors[0]!.doctorId,
    chamberNumber: 'CH-1',
    tokenNumber: 5,
    patientName: 'Rajesh Sharma',
    patientMobile: '9826012345',
    status: AppointmentStatus.IN_CONSULTATION,
    source: BookingSource.WALK_IN,
    paymentStatus: PaymentStatus.PAID_CASH,
    triageSeverity: TriageSeverity.ROUTINE,
    amountRupees: 700,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'apt-002',
    clinicId: SEED_DATA.clinic.id,
    doctorId: SEED_DATA.doctors[0]!.doctorId,
    chamberNumber: 'CH-1',
    tokenNumber: 6,
    patientName: 'Anand Mishra',
    patientMobile: '9826054321',
    status: AppointmentStatus.WAITING,
    source: BookingSource.ONLINE_PORTAL,
    paymentStatus: PaymentStatus.PENDING_AT_DESK,
    triageSeverity: TriageSeverity.URGENT_TRIAGE,
    amountRupees: 700,
    createdAt: new Date().toISOString(),
  },
];

let nextTokenCounter = 7;

export async function receptionRoutes(fastify: FastifyInstance) {
  /**
   * 15-Second Walk-in Intake: POST /api/v1/reception/intake
   * Assigns sequential token number and records cash/UPI collection instantly
   */
  fastify.post(
    '/reception/intake',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const parseResult = intakeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const data = parseResult.data;
      const user = req.tenant;

      // Staff Scope Check: dedicated staff cannot intake for another doctor
      if (user && user.staffScope === StaffScope.DOCTOR_DEDICATED && user.dedicatedDoctorId) {
        if (user.dedicatedDoctorId !== data.doctorId) {
          return reply.status(403).send({
            error: 'Staff Scope Restriction',
            message: `Dedicated staff is restricted to assigned doctor '${user.dedicatedDoctorId}'. Cross-doctor intake forbidden.`,
          });
        }
      }

      try {
        const { appointment, thermalSlipData } = await appointmentService.createWalkInIntake({
          clinicId: data.clinicId,
          doctorId: data.doctorId,
          chamberNumber: data.chamberNumber,
          patientName: data.patientName,
          patientMobile: data.mobile,
          patientAge: data.ageYears,
          patientGender: data.gender,
          locality: data.locality,
          triageSeverity: data.triageSeverity,
          paymentMethod: data.paymentMethod,
          amountRupees: data.amountRupees,
          allowDuplicate: data.allowDuplicate,
          emergencyOverride: data.emergencyOverride,
        });

        // Trigger SSE update to Waiting Room TV
        const upNextTokens = appointmentService.getWaitingTokensForChamber(
          data.clinicId,
          data.chamberNumber
        );
        realtimeStreamManager.broadcastChamberUpdate(data.clinicId, data.chamberNumber, {
          upNextTokens: upNextTokens.length > 0 ? upNextTokens : [appointment.tokenNumber],
        });

        if (
          appointment.paymentStatus === PaymentStatus.PAID_CASH ||
          appointment.paymentStatus === PaymentStatus.PAID_UPI_QR
        ) {
          cashieringService.recordIntakeLedger(
            appointment,
            user?.userId,
            user?.fullName || 'Receptionist',
            thermalSlipData.doctorName
          );
        }

        return reply.status(200).send({
          success: true,
          tokenNumber: appointment.tokenNumber,
          chamberNumber: appointment.chamberNumber,
          appointment,
          thermalSlipData,
        });
      } catch (err: any) {
        const message = err.message || '';
        if (message.includes('DUPLICATE_ACTIVE_APPOINTMENT')) {
          return reply.status(409).send({
            error: 'Duplicate Intake',
            message,
          });
        }
        if (message.includes('TOKEN_CAP_REACHED')) {
          return reply.status(409).send({
            error: 'Token Cap Reached',
            message,
          });
        }
        return reply.status(400).send({
          error: 'Intake Error',
          message,
        });
      }
    }
  );

  /**
   * Offline Queue Buffer Batch Sync: POST /api/v1/reception/intake/batch-sync
   * Reconciles offline walk-in intakes collected during internet dropouts
   */
  fastify.post(
    '/reception/intake/batch-sync',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [
            UserRole.RECEPTIONIST,
            UserRole.CLINIC_ADMIN,
            UserRole.DOCTOR,
            UserRole.SUPER_ADMIN,
          ],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const user = req.tenant!;
      const parsed = batchSyncSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid offline batch sync payload',
          details: parsed.error.errors,
        });
      }

      try {
        const actor = {
          userId: user.userId,
          role: user.activeRole,
          activeClinicId: user.activeClinicId,
          name: user.fullName || 'Reception Staff',
          dedicatedDoctorId: user.dedicatedDoctorId,
          staffScope: user.staffScope,
        };

        const result = await offlineSyncService.syncBatch(parsed.data, actor);
        return reply.status(200).send(result);
      } catch (err: any) {
        const message = err.message || '';
        if (message.includes('FORBIDDEN_SCOPE')) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message,
          });
        }
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message,
        });
      }
    }
  );

  /**
   * Chamber Queues: GET /api/v1/reception/queues
   * Supports Dual-Scope: CLINIC_WIDE gets all chambers; DOCTOR_DEDICATED gets only assigned doctor
   */
  fastify.get(
    '/reception/queues',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req) => {
      const user = req.tenant!;
      const query = req.query as { date?: string };
      const targetDate =
        query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
          ? query.date
          : new Date().toISOString().split('T')[0]!;

      let allowedChambers = SEED_DATA.chambers;

      // Restrict scope if doctor-dedicated receptionist
      if (user.staffScope === StaffScope.DOCTOR_DEDICATED && user.dedicatedDoctorId) {
        const assignedDoc = SEED_DATA.doctors.find((d) => d.doctorId === user.dedicatedDoctorId);
        if (assignedDoc) {
          allowedChambers = SEED_DATA.chambers.filter((c) => c.chamberNumber === assignedDoc.chamberNumber);
        }
      }

      // 1. Fetch live appointments from appointmentService for clinic & targetDate
      const activeAppts = appointmentService.getActiveAppointmentsForClinic(user.activeClinicId!, targetDate);

      // 2. Also merge inMemoryAppointments if targetDate is today and not already present
      const today = new Date().toISOString().split('T')[0]!;
      const mergedAppts = [...activeAppts];
      if (targetDate === today) {
        for (const mock of inMemoryAppointments) {
          if (!mergedAppts.some((a) => a.id === mock.id)) {
            mergedAppts.push({
              ...mock,
              appointmentDate: targetDate,
              patientId: `pat-${mock.id}`,
              updatedAt: mock.createdAt,
            });
          }
        }
      }

      // 3. Get realtime TV state for current chamber delays
      const tvState = realtimeStreamManager.getSnapshot(user.activeClinicId!);

      // 4. Format response by chamber
      const queues: ChamberQueueDetail[] = await Promise.all(
        allowedChambers.map(async (chamber) => {
          const doc = SEED_DATA.doctors.find((d) => d.chamberNumber === chamber.chamberNumber);
          const chamberAppts = mergedAppts.filter((a) => a.chamberNumber === chamber.chamberNumber);

          // Get delay from TV snapshot
          const tvChamber = tvState.chambers.find((c: ChamberTVState) => c.chamberNumber === chamber.chamberNumber);
          const delayMinutes = tvChamber?.delayMinutes ?? 0;
          const isDelayActive = delayMinutes > 0;

          // Get doctor session info
          let sessionStartTime: string | undefined;
          let sessionEndTime: string | undefined;
          let avgConsultMinutes = 15;

          if (doc?.doctorId) {
            const sessions = await sessionService.getSessionsByDoctor(doc.doctorId, user.activeClinicId);
            if (sessions.length > 0) {
              const activeSession = sessions[0]!;
              sessionStartTime = activeSession.startTime;
              sessionEndTime = activeSession.endTime;
              avgConsultMinutes = activeSession.slotDurationMinutes || 15;
            }
          }

          // Currently serving
          const rawServing = chamberAppts.find((a) => a.status === AppointmentStatus.IN_CONSULTATION);
          const currentlyServing: QueueAppointmentItem | null = rawServing
            ? {
                id: rawServing.id,
                tokenNumber: rawServing.tokenNumber,
                formattedToken: `${chamber.chamberNumber.replace('-', '')}-${rawServing.tokenNumber.toString().padStart(3, '0')}`,
                patientName: rawServing.patientName,
                patientMobileMasked: `${rawServing.patientMobile.slice(0, 5)}*****`,
                source: rawServing.source,
                status: rawServing.status,
                paymentStatus: rawServing.paymentStatus,
                amountRupees: rawServing.amountRupees,
                triageSeverity: rawServing.triageSeverity,
                estimatedStartTime: rawServing.actualStartTime || undefined,
                estimatedWaitMinutes: 0,
                receiptNumber: rawServing.receiptNumber,
                createdAt: rawServing.createdAt,
              }
            : null;

          // Waiting Queue: WAITING or ARRIVED
          const rawWaiting = chamberAppts.filter(
            (a) => a.status === AppointmentStatus.WAITING || a.status === AppointmentStatus.ARRIVED
          );

          // Priority sorting: URGENT_TRIAGE first, then sequential tokenNumber (FIFO)
          rawWaiting.sort((a, b) => {
            const aUrgent = a.triageSeverity === TriageSeverity.URGENT_TRIAGE ? 1 : 0;
            const bUrgent = b.triageSeverity === TriageSeverity.URGENT_TRIAGE ? 1 : 0;
            if (aUrgent !== bUrgent) {
              return bUrgent - aUrgent; // urgent first
            }
            return a.tokenNumber - b.tokenNumber;
          });

          const waitingQueue: QueueAppointmentItem[] = rawWaiting.map((app, idx) => {
            const estimatedWaitMinutes = idx * avgConsultMinutes + delayMinutes;
            return {
              id: app.id,
              tokenNumber: app.tokenNumber,
              formattedToken: `${chamber.chamberNumber.replace('-', '')}-${app.tokenNumber.toString().padStart(3, '0')}`,
              patientName: app.patientName,
              patientMobileMasked: `${app.patientMobile.slice(0, 5)}*****`,
              source: app.source,
              status: app.status,
              paymentStatus: app.paymentStatus,
              amountRupees: app.amountRupees,
              triageSeverity: app.triageSeverity,
              estimatedWaitMinutes,
              receiptNumber: app.receiptNumber,
              createdAt: app.createdAt,
            };
          });

          // Completed Queue
          const rawCompleted = chamberAppts.filter((a) => a.status === AppointmentStatus.COMPLETED);
          const completedQueue: QueueAppointmentItem[] = rawCompleted.map((app) => ({
            id: app.id,
            tokenNumber: app.tokenNumber,
            formattedToken: `${chamber.chamberNumber.replace('-', '')}-${app.tokenNumber.toString().padStart(3, '0')}`,
            patientName: app.patientName,
            patientMobileMasked: `${app.patientMobile.slice(0, 5)}*****`,
            source: app.source,
            status: app.status,
            paymentStatus: app.paymentStatus,
            amountRupees: app.amountRupees,
            triageSeverity: app.triageSeverity,
            estimatedWaitMinutes: 0,
            receiptNumber: app.receiptNumber,
            createdAt: app.createdAt,
          }));

          const totalWalkIn = chamberAppts.filter((a) => a.source === BookingSource.WALK_IN).length;
          const totalOnline = chamberAppts.filter((a) => a.source === BookingSource.ONLINE_PORTAL).length;
          const estimatedWaitMinutes = waitingQueue.length * avgConsultMinutes + delayMinutes;

          return {
            chamberNumber: chamber.chamberNumber,
            chamberName: chamber.chamberName,
            doctorId: doc?.doctorId,
            doctorName: doc?.fullName,
            specialty: doc?.specialties[0],
            consultationFee: doc?.consultationFee,
            sessionStartTime,
            sessionEndTime,
            delayMinutes,
            isDelayActive,
            currentlyServing,
            waitingQueue,
            completedQueue,
            totalWaiting: waitingQueue.length,
            totalCompleted: completedQueue.length,
            totalWalkIn,
            totalOnline,
            estimatedWaitMinutes,
          };
        })
      );

      const metrics: ClinicQueueMetrics = {
        totalActiveChambers: queues.length,
        totalWaitingClinicWide: queues.reduce((sum, q) => sum + q.totalWaiting, 0),
        totalCompletedClinicWide: queues.reduce((sum, q) => sum + q.totalCompleted, 0),
        totalWalkInClinicWide: queues.reduce((sum, q) => sum + q.totalWalkIn, 0),
        totalOnlineClinicWide: queues.reduce((sum, q) => sum + q.totalOnline, 0),
        totalExpectedRevenueRupees: mergedAppts.reduce((sum, a) => sum + a.amountRupees, 0),
      };

      const response: MultiChamberQueueResponse = {
        clinicId: user.activeClinicId!,
        date: targetDate,
        staffScope: user.staffScope ?? StaffScope.CLINIC_WIDE,
        metrics,
        queues,
      };

      return response;
    }
  );

  /**
   * Update Appointment Queue Status: PATCH /api/v1/reception/appointment/:id/status
   */
  fastify.patch(
    '/reception/appointment/:id/status',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.CLINIC_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as { status: AppointmentStatus; notes?: string; allowReopen?: boolean };
      const user = req.tenant!;

      // Check if it's in appointmentService
      const inService = await appointmentService.getAppointmentById(id);
      if (inService) {
        try {
          const result = await queueTransitionController.transitionStatus(id, body, {
            userId: user.userId,
            role: user.activeRole,
            staffScope: user.staffScope,
            dedicatedDoctorId: user.dedicatedDoctorId,
          });

          return reply.status(200).send({
            success: true,
            appointment: result.appointment,
            transitionRecord: result.transitionRecord,
          });
        } catch (err: any) {
          const msg = err.message || '';
          if (msg.includes('not found')) {
            return reply.status(404).send({ error: 'Appointment not found' });
          }
          if (msg.includes('Forbidden') || msg.includes('restricted')) {
            return reply.status(403).send({ error: 'Forbidden', message: msg });
          }
          if (msg.includes('TERMINAL_STATE_LOCKED')) {
            return reply.status(400).send({ error: 'Bad Request', message: msg });
          }
          return reply.status(500).send({ error: 'Internal Error', message: msg });
        }
      }

      // Fallback for mock appointments
      const appointmentInMock = inMemoryAppointments.find((a) => a.id === id);
      if (appointmentInMock) {
        appointmentInMock.status = body.status;
        if (body.status === AppointmentStatus.IN_CONSULTATION) {
          realtimeStreamManager.broadcastChamberUpdate(
            appointmentInMock.clinicId,
            appointmentInMock.chamberNumber,
            {
              currentToken: appointmentInMock.tokenNumber,
              servingPatientMaskedName: `${appointmentInMock.patientName[0]}***`,
            }
          );
        }
        return reply.status(200).send({
          success: true,
          appointment: appointmentInMock,
        });
      }

      return reply.status(404).send({ error: 'Appointment not found' });
    }
  );

  /**
   * Format Thermal Receipt Preview: POST /api/v1/reception/thermal-receipt/preview
   */
  fastify.post('/reception/thermal-receipt/preview', async (req, reply) => {
    const body = req.body as any;
    if (!body || !body.clinicName || !body.tokenFormatted) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Missing required thermal slip fields' });
    }

    const width = body.width === '58mm' ? '58mm' : '80mm';
    const formatted = thermalReceiptService.formatReceipt(body, { width, cutPaper: body.cutPaper });

    return reply.status(200).send({
      success: true,
      formatted,
    });
  });

  /**
   * Generate Binary ESC/POS Stream: POST /api/v1/reception/thermal-receipt/escpos
   */
  fastify.post('/reception/thermal-receipt/escpos', async (req, reply) => {
    const body = req.body as any;
    if (!body || !body.clinicName || !body.tokenFormatted) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Missing required thermal slip fields' });
    }

    const width = body.width === '58mm' ? '58mm' : '80mm';
    const buffer = thermalReceiptService.generateEscPosBuffer(body, {
      width,
      cutPaper: body.cutPaper !== false,
    });

    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Disposition', `inline; filename="receipt-${body.receiptNumber || 'print'}.bin"`);
    return reply.send(buffer);
  });
}

