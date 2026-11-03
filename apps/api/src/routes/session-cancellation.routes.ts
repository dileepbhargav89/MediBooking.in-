/**
 * Doctor Emergency Session Cancellation & Slot Invalidation Routes
 * (Phase 21)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole } from '@medibooking/types';
import { requireAuth } from '../middleware/tenant-context';
import { sessionCancellationEngine } from '../services/session-cancellation-engine';
import { SEED_DATA } from '@medibooking/database';

const emergencyCancelSchema = z.object({
  clinicId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  cancellationReason: z.string().min(5, 'Cancellation reason must be at least 5 characters long').max(500),
  notifyPatients: z.boolean().optional(),
  rescheduleWindowDays: z.number().int().min(1).max(90).optional(),
});

export async function sessionCancellationRoutes(fastify: FastifyInstance) {
  /**
   * Emergency Cancel Session: POST /api/v1/sessions/emergency-cancel
   */
  fastify.post(
    '/sessions/emergency-cancel',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const parseResult = emergencyCancelSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const user = req.tenant!;
      const clinicId = parseResult.data.clinicId || user.activeClinicId || SEED_DATA.clinic.id;
      const doctorId =
        parseResult.data.doctorId ||
        user.dedicatedDoctorId ||
        (user.activeRole === UserRole.DOCTOR ? user.userId : SEED_DATA.doctors[0]!.doctorId);

      try {
        const result = await sessionCancellationEngine.cancelSession(
          {
            ...parseResult.data,
            clinicId,
            doctorId,
          },
          {
            userId: user.userId,
            role: user.activeRole,
            staffScope: user.staffScope,
            dedicatedDoctorId: user.dedicatedDoctorId,
          }
        );

        return reply.status(200).send(result);
      } catch (err: any) {
        const msg = err.message || 'Session cancellation failed';
        if (msg.includes('not found')) {
          return reply.status(404).send({ error: 'Not Found', message: msg });
        }
        if (msg.includes('Forbidden') || msg.includes('restricted')) {
          return reply.status(403).send({ error: 'Forbidden', message: msg });
        }
        return reply.status(400).send({ error: 'Bad Request', message: msg });
      }
    }
  );

  /**
   * Query Session Cancellation History: GET /api/v1/sessions/cancellations
   */
  fastify.get(
    '/sessions/cancellations',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const { doctorId } = req.query as { doctorId?: string };
      const clinicId = req.tenant!.activeClinicId || SEED_DATA.clinic.id;

      const history = sessionCancellationEngine.getCancellationHistory(clinicId, doctorId);
      return reply.status(200).send({
        clinicId,
        count: history.length,
        history,
      });
    }
  );

  /**
   * Check Session Cancellation Status: GET /api/v1/sessions/cancellation-status
   */
  fastify.get(
    '/sessions/cancellation-status',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [
            UserRole.DOCTOR,
            UserRole.CLINIC_ADMIN,
            UserRole.RECEPTIONIST,
            UserRole.PATIENT,
            UserRole.SUPER_ADMIN,
          ],
        }),
      ],
    },
    async (req, reply) => {
      const { clinicId, doctorId, date } = req.query as {
        clinicId?: string;
        doctorId?: string;
        date?: string;
      };

      const resolvedClinicId = clinicId || req.tenant?.activeClinicId || SEED_DATA.clinic.id;
      const resolvedDoctorId =
        doctorId || req.tenant?.dedicatedDoctorId || req.tenant?.userId || SEED_DATA.doctors[0]!.doctorId;
      const resolvedDate = date || (new Date().toISOString().split('T')[0] as string);

      const isCancelled = sessionCancellationEngine.isSessionCancelled(
        resolvedClinicId,
        resolvedDoctorId,
        resolvedDate
      );
      const record = sessionCancellationEngine.getCancellationRecord(
        resolvedClinicId,
        resolvedDoctorId,
        resolvedDate
      );

      return reply.status(200).send({
        clinicId: resolvedClinicId,
        doctorId: resolvedDoctorId,
        date: resolvedDate,
        isCancelled,
        record,
      });
    }
  );
}
