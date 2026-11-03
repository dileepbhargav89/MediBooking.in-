/**
 * Doctor-Dedicated Compounder Routes (Phase 17)
 * Tailored for chamber-specific attendants managing pre-consultation vitals,
 * single-chamber live queues, and 1-tap call-next progression.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  UserRole,
  StaffScope,
  AppointmentStatus,
  TriageSeverity,
  CompounderQueueResponse,
  QueueAppointmentItem,
  ChamberTVState,
  maskPatientName,
} from '@medibooking/types';
import { requireAuth } from '../middleware/tenant-context';
import { appointmentService } from '../services/appointment-service';
import { sessionService } from '../services/session-service';
import { realtimeStreamManager } from '../services/realtime-sse';
import { SEED_DATA } from '@medibooking/database';

const vitalsSchema = z.object({
  bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'Must be in format like 120/80').optional(),
  pulseBpm: z.number().int().min(30).max(250).optional(),
  weightKg: z.number().min(1).max(300).optional(),
  temperatureF: z.number().min(90).max(110).optional(),
  spo2Percent: z.number().min(50).max(100).optional(),
  chiefComplaints: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

const callNextSchema = z.object({
  doctorId: z.string().optional(),
  chamberNumber: z.string().optional(),
});

export async function compounderRoutes(fastify: FastifyInstance) {
  /**
   * Single-Chamber Dedicated Queue
   * GET /api/v1/compounder/queue
   */
  fastify.get(
    '/compounder/queue',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const user = req.tenant!;
      const query = req.query as { doctorId?: string; chamberNumber?: string; date?: string };
      const targetDate =
        query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
          ? query.date
          : new Date().toISOString().split('T')[0]!;

      // 1. Resolve Target Doctor ID
      let targetDoctorId: string | undefined = query.doctorId;

      if (user.staffScope === StaffScope.DOCTOR_DEDICATED && user.dedicatedDoctorId) {
        if (query.doctorId && query.doctorId !== user.dedicatedDoctorId) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: `Staff scope restricted to assigned doctor '${user.dedicatedDoctorId}'. Cross-chamber access forbidden.`,
          });
        }
        targetDoctorId = user.dedicatedDoctorId;
      } else if (user.activeRole === UserRole.DOCTOR) {
        targetDoctorId = user.userId;
      }

      if (!targetDoctorId) {
        // Fall back to first doctor in seed data if none specified by admin
        targetDoctorId = SEED_DATA.doctors[0]!.doctorId;
      }

      const doctor = SEED_DATA.doctors.find((d) => d.doctorId === targetDoctorId);
      if (!doctor) {
        return reply.status(404).send({ error: 'Not Found', message: `Doctor ${targetDoctorId} not found` });
      }

      const chamber = SEED_DATA.chambers.find((c) => c.chamberNumber === doctor.chamberNumber) || {
        chamberNumber: doctor.chamberNumber,
        chamberName: `Chamber ${doctor.chamberNumber}`,
      };

      // 2. Query Chamber Appointments
      const clinicAppts = appointmentService.getActiveAppointmentsForClinic(user.activeClinicId!, targetDate);
      const chamberAppts = clinicAppts.filter(
        (a) => a.doctorId === doctor.doctorId && a.chamberNumber === doctor.chamberNumber
      );

      // 3. Query Session & Delay info
      const tvState = realtimeStreamManager.getSnapshot(user.activeClinicId!);
      const tvChamber = tvState.chambers.find((c: ChamberTVState) => c.chamberNumber === doctor.chamberNumber);
      const delayMinutes = tvChamber?.delayMinutes ?? 0;
      const isDelayActive = delayMinutes > 0;

      let sessionStartTime: string | undefined;
      let sessionEndTime: string | undefined;
      let slotDurationMinutes = 15;

      const sessions = await sessionService.getSessionsByDoctor(doctor.doctorId, user.activeClinicId);
      if (sessions.length > 0) {
        sessionStartTime = sessions[0]!.startTime;
        sessionEndTime = sessions[0]!.endTime;
        slotDurationMinutes = sessions[0]!.slotDurationMinutes || 15;
      }

      // 4. Formatter helper
      const formatItem = (app: any, waitMinutes = 0): QueueAppointmentItem => ({
        id: app.id,
        tokenNumber: app.tokenNumber,
        formattedToken: `${doctor.chamberNumber.replace('-', '')}-${app.tokenNumber.toString().padStart(3, '0')}`,
        patientName: app.patientName,
        patientMobileMasked: `${app.patientMobile.slice(0, 5)}*****`,
        source: app.source,
        status: app.status,
        paymentStatus: app.paymentStatus,
        amountRupees: app.amountRupees,
        triageSeverity: app.triageSeverity,
        estimatedStartTime: app.actualStartTime || undefined,
        estimatedWaitMinutes: waitMinutes,
        receiptNumber: app.receiptNumber,
        vitals: app.vitals,
        createdAt: app.createdAt,
      });

      // 5. Partition Queues
      const servingRaw = chamberAppts.find((a) => a.status === AppointmentStatus.IN_CONSULTATION);
      const currentlyServing = servingRaw ? formatItem(servingRaw, 0) : null;

      const waitingRaw = chamberAppts.filter(
        (a) => a.status === AppointmentStatus.WAITING || a.status === AppointmentStatus.ARRIVED
      );

      // Priority sort: URGENT_TRIAGE first, then tokenNumber (FIFO)
      waitingRaw.sort((a, b) => {
        const aUrgent = a.triageSeverity === TriageSeverity.URGENT_TRIAGE ? 1 : 0;
        const bUrgent = b.triageSeverity === TriageSeverity.URGENT_TRIAGE ? 1 : 0;
        if (aUrgent !== bUrgent) {
          return bUrgent - aUrgent;
        }
        return a.tokenNumber - b.tokenNumber;
      });

      const waitingQueue = waitingRaw.map((app, idx) =>
        formatItem(app, idx * slotDurationMinutes + delayMinutes)
      );

      const nextPatient = waitingQueue.length > 0 ? waitingQueue[0]! : null;

      const completedRaw = chamberAppts.filter((a) => a.status === AppointmentStatus.COMPLETED);
      const completedQueue = completedRaw.map((app) => formatItem(app, 0));

      const vitalsRecordedCount = chamberAppts.filter((a) => a.vitals && Object.keys(a.vitals).length > 0).length;
      const urgentCount = waitingRaw.filter((a) => a.triageSeverity === TriageSeverity.URGENT_TRIAGE).length;

      const response: CompounderQueueResponse = {
        clinicId: user.activeClinicId!,
        chamberNumber: doctor.chamberNumber,
        chamberName: chamber.chamberName,
        doctorId: doctor.doctorId,
        doctorName: doctor.fullName,
        specialty: doctor.specialties[0],
        sessionStartTime,
        sessionEndTime,
        delayMinutes,
        isDelayActive,
        currentlyServing,
        nextPatient,
        waitingQueue,
        completedQueue,
        stats: {
          totalQueue: chamberAppts.length,
          waitingCount: waitingQueue.length,
          completedCount: completedQueue.length,
          vitalsRecordedCount,
          urgentCount,
          estimatedWaitMinutes: waitingQueue.length * slotDurationMinutes + delayMinutes,
        },
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * Pre-Consultation Vitals Recording
   * PATCH /api/v1/compounder/appointment/:id/vitals
   */
  fastify.patch(
    '/compounder/appointment/:id/vitals',
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
      const user = req.tenant!;

      const parseResult = vitalsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      try {
        const updated = appointmentService.recordVitals(id, parseResult.data, {
          userId: user.userId,
          role: user.activeRole,
          staffScope: user.staffScope,
          dedicatedDoctorId: user.dedicatedDoctorId,
        });

        return reply.status(200).send({
          success: true,
          message: 'Vitals recorded successfully',
          appointment: updated,
        });
      } catch (err: any) {
        const msg = err.message || 'Failed to record vitals';
        if (msg.includes('not found')) {
          return reply.status(404).send({ error: 'Not Found', message: msg });
        }
        if (msg.includes('Forbidden') || msg.includes('restricted')) {
          return reply.status(403).send({ error: 'Forbidden', message: msg });
        }
        return reply.status(500).send({ error: 'Internal Server Error', message: msg });
      }
    }
  );

  /**
   * 1-Tap Queue Advancement: Call Next Patient
   * POST /api/v1/compounder/chamber/call-next
   */
  fastify.post(
    '/compounder/chamber/call-next',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.CLINIC_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const user = req.tenant!;
      const parseResult = callNextSchema.safeParse(req.body || {});

      let doctorId = parseResult.success ? parseResult.data.doctorId : undefined;
      let chamberNumber = parseResult.success ? parseResult.data.chamberNumber : undefined;

      if (user.staffScope === StaffScope.DOCTOR_DEDICATED && user.dedicatedDoctorId) {
        doctorId = user.dedicatedDoctorId;
      } else if (user.activeRole === UserRole.DOCTOR) {
        doctorId = user.userId;
      }

      if (!doctorId) {
        doctorId = SEED_DATA.doctors[0]!.doctorId;
      }

      const doctor = SEED_DATA.doctors.find((d) => d.doctorId === doctorId);
      if (!chamberNumber && doctor) {
        chamberNumber = doctor.chamberNumber;
      }
      chamberNumber = chamberNumber || 'CH-1';

      const result = appointmentService.callNextPatient(user.activeClinicId!, doctorId, chamberNumber);

      // Broadcast TV display update
      if (result.servingAppointment) {
        realtimeStreamManager.broadcastChamberUpdate(user.activeClinicId!, chamberNumber, {
          currentToken: result.servingAppointment.tokenNumber,
          servingPatientMaskedName: maskPatientName(result.servingAppointment.patientName),
        });
      } else {
        realtimeStreamManager.broadcastChamberUpdate(user.activeClinicId!, chamberNumber, {
          currentToken: null,
          servingPatientMaskedName: null,
        });
      }

      return reply.status(200).send({
        success: true,
        message: result.servingAppointment
          ? `Called Token #${result.servingAppointment.tokenNumber} into consultation`
          : 'No more waiting patients in this chamber queue',
        completedAppointment: result.completedAppointment,
        servingAppointment: result.servingAppointment,
      });
    }
  );
}

