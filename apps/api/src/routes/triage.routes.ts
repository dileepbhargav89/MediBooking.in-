/**
 * Front-Desk Emergency Override & Triage Urgency Priority Interleaving Routes
 * (Phase 19)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TriageSeverity, UserRole } from '@medibooking/types';
import { requireAuth } from '../middleware/tenant-context';
import { triageInterleavingService } from '../services/triage-interleaving-service';

const triageUpdateSchema = z.object({
  triageSeverity: z.nativeEnum(TriageSeverity),
  clinicalJustification: z.string().min(3).max(500),
});

export async function triageRoutes(fastify: FastifyInstance) {
  /**
   * Escalate or adjust triage urgency for an appointment
   * PATCH /api/v1/appointments/:id/triage
   */
  fastify.patch(
    '/appointments/:id/triage',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.tenant!;

      const parseResult = triageUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      try {
        const result = await triageInterleavingService.escalateTriage(id, parseResult.data, {
          userId: user.userId,
          role: user.activeRole,
          staffScope: user.staffScope,
          dedicatedDoctorId: user.dedicatedDoctorId,
        });

        return reply.status(200).send({
          success: true,
          ...result,
        });
      } catch (err: any) {
        const msg = err.message || 'Triage update failed';
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
   * Get Prioritized Interleaved Waiting Queue for a Chamber
   * GET /api/v1/reception/queues/chamber/:chamberNumber/interleaved
   */
  fastify.get(
    '/reception/queues/chamber/:chamberNumber/interleaved',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const { chamberNumber } = req.params as { chamberNumber: string };
      const { date } = req.query as { date?: string };
      const clinicId = req.tenant!.activeClinicId!;

      const interleavedQueue = triageInterleavingService.getInterleavedQueue(
        clinicId,
        chamberNumber,
        date
      );

      return reply.status(200).send({
        success: true,
        ...interleavedQueue,
      });
    }
  );

  /**
   * Get Triage Audit History for an Appointment
   * GET /api/v1/appointments/:id/triage-history
   */
  fastify.get(
    '/appointments/:id/triage-history',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const history = triageInterleavingService.getTriageAuditHistory(id);

      return reply.status(200).send({
        appointmentId: id,
        count: history.length,
        history,
      });
    }
  );
}
