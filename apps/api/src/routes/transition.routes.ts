/**
 * Non-Linear Appointment Queue State Transition Routes (Phase 18)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppointmentStatus, UserRole } from '@medibooking/types';
import { requireAuth } from '../middleware/tenant-context';
import { queueTransitionController } from '../services/queue-transition-controller';

const transitionSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
  notes: z.string().max(500).optional(),
  allowReopen: z.boolean().optional(),
});

export async function transitionRoutes(fastify: FastifyInstance) {
  /**
   * Transition Appointment Queue State (Non-Linear)
   * PATCH /api/v1/appointments/:id/transition
   */
  fastify.patch(
    '/appointments/:id/transition',
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

      const parseResult = transitionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      try {
        const result = await queueTransitionController.transitionStatus(id, parseResult.data, {
          userId: user.userId,
          role: user.activeRole,
          staffScope: user.staffScope,
          dedicatedDoctorId: user.dedicatedDoctorId,
        });

        return reply.status(200).send(result);
      } catch (err: any) {
        const msg = err.message || 'Transition failed';
        if (msg.includes('not found')) {
          return reply.status(404).send({ error: 'Not Found', message: msg });
        }
        if (msg.includes('Forbidden') || msg.includes('restricted')) {
          return reply.status(403).send({ error: 'Forbidden', message: msg });
        }
        if (msg.includes('TERMINAL_STATE_LOCKED')) {
          return reply.status(400).send({ error: 'Bad Request', message: msg });
        }
        return reply.status(500).send({ error: 'Internal Server Error', message: msg });
      }
    }
  );

  /**
   * Get Appointment State Transition Audit History
   * GET /api/v1/appointments/:id/transitions
   */
  fastify.get(
    '/appointments/:id/transitions',
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
      const history = queueTransitionController.getTransitions(id);

      return reply.status(200).send({
        appointmentId: id,
        count: history.length,
        transitions: history,
      });
    }
  );
}

