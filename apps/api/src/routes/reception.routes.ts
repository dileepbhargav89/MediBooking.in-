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
  TriageSeverity,
  QuickIntakeDTO,
} from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';
import { realtimeStreamManager } from '../services/realtime-sse';
import { appointmentService } from '../services/appointment-service';
import { cashieringService } from '../services/cashiering-service';

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

      let allowedChambers = SEED_DATA.chambers;

      // Restrict scope if doctor-dedicated receptionist
      if (user.staffScope === StaffScope.DOCTOR_DEDICATED && user.dedicatedDoctorId) {
        const assignedDoc = SEED_DATA.doctors.find((d) => d.doctorId === user.dedicatedDoctorId);
        if (assignedDoc) {
          allowedChambers = SEED_DATA.chambers.filter((c) => c.chamberNumber === assignedDoc.chamberNumber);
        }
      }

      // Format response by chamber
      const queues = allowedChambers.map((chamber) => {
        const doc = SEED_DATA.doctors.find((d) => d.chamberNumber === chamber.chamberNumber);
        const chamberAppts = inMemoryAppointments.filter((a) => a.chamberNumber === chamber.chamberNumber);

        return {
          chamberNumber: chamber.chamberNumber,
          chamberName: chamber.chamberName,
          doctorId: doc?.doctorId,
          doctorName: doc?.fullName,
          specialty: doc?.specialties[0],
          consultationFee: doc?.consultationFee,
          currentlyServing: chamberAppts.find((a) => a.status === AppointmentStatus.IN_CONSULTATION) ?? null,
          waitingQueue: chamberAppts.filter((a) => a.status === AppointmentStatus.WAITING),
          totalWaiting: chamberAppts.filter((a) => a.status === AppointmentStatus.WAITING).length,
        };
      });

      return {
        clinicId: user.activeClinicId,
        staffScope: user.staffScope ?? StaffScope.CLINIC_WIDE,
        queues,
      };
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
      const body = req.body as { status: AppointmentStatus };

      const appointment = inMemoryAppointments.find((a) => a.id === id);
      if (!appointment) {
        return reply.status(404).send({ error: 'Appointment not found' });
      }

      appointment.status = body.status;

      // If called in consultation, update chamber TV state
      if (body.status === AppointmentStatus.IN_CONSULTATION) {
        realtimeStreamManager.broadcastChamberUpdate(appointment.clinicId, appointment.chamberNumber, {
          currentToken: appointment.tokenNumber,
          servingPatientMaskedName: `${appointment.patientName[0]}***`,
        });
      }

      return {
        success: true,
        appointment,
      };
    }
  );
}

