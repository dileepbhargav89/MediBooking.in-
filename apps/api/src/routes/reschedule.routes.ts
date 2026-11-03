/**
 * Automated 14-Day VIP Priority Reschedule Queue Routes
 * (Phase 22)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole } from '@medibooking/types';
import { requireAuth } from '../middleware/tenant-context';
import { rescheduleQueueService } from '../services/reschedule-queue-service';
import { SEED_DATA } from '@medibooking/database';

const claimRescheduleSchema = z.object({
  cancelledAppointmentId: z.string().uuid(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'targetDate must be formatted as YYYY-MM-DD'),
  targetSlotId: z.string().optional(),
  targetChamberNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function rescheduleRoutes(fastify: FastifyInstance) {
  /**
   * List Eligible VIP Reschedule Patients: GET /api/v1/reschedule/eligible
   */
  fastify.get(
    '/reschedule/eligible',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const { doctorId, mobile } = req.query as { doctorId?: string; mobile?: string };
      const clinicId = req.tenant!.activeClinicId || SEED_DATA.clinic.id;

      const eligible = await rescheduleQueueService.getEligibleAppointments(clinicId, {
        doctorId,
        mobile,
      });

      return reply.status(200).send({
        clinicId,
        count: eligible.length,
        eligibleAppointments: eligible,
      });
    }
  );

  /**
   * Claim VIP Priority Reschedule: POST /api/v1/reschedule/claim
   */
  fastify.post(
    '/reschedule/claim',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const parseResult = claimRescheduleSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const user = req.tenant!;
      try {
        const result = await rescheduleQueueService.claimVipReschedule(parseResult.data, {
          userId: user.userId,
          role: user.activeRole,
          staffScope: user.staffScope,
          dedicatedDoctorId: user.dedicatedDoctorId,
        });

        return reply.status(200).send(result);
      } catch (err: any) {
        const msg = err.message || 'Reschedule claim failed';
        if (msg.includes('not found')) {
          return reply.status(404).send({ error: 'Not Found', message: msg });
        }
        if (msg.includes('Forbidden') || msg.includes('restricted')) {
          return reply.status(403).send({ error: 'Forbidden', message: msg });
        }
        if (msg.includes('ALREADY_RESCHEDULED') || msg.includes('already been rescheduled')) {
          return reply.status(409).send({ error: 'Conflict', message: msg });
        }
        return reply.status(400).send({ error: 'Bad Request', message: msg });
      }
    }
  );

  /**
   * Check Single Appointment Eligibility: GET /api/v1/reschedule/check/:appointmentId
   */
  fastify.get(
    '/reschedule/check/:appointmentId',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [
            UserRole.RECEPTIONIST,
            UserRole.DOCTOR,
            UserRole.CLINIC_ADMIN,
            UserRole.PATIENT,
            UserRole.SUPER_ADMIN,
          ],
        }),
      ],
    },
    async (req, reply) => {
      const { appointmentId } = req.params as { appointmentId: string };
      const status = await rescheduleQueueService.checkEligibility(appointmentId);
      return reply.status(200).send(status);
    }
  );
}
