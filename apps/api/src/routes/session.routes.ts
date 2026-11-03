/**
 * Clinic Session Planner Routes
 * Manages recurring weekly doctor schedules, variable specialty slot durations,
 * and token quotas (walk-in vs online pre-booking).
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sessionService } from '../services/session-service';
import { requireAuth } from '../middleware/tenant-context';
import { UserRole, SessionType, DayOfWeek } from '@medibooking/types';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const createSessionSchema = z.object({
  clinicId: z.string().uuid(),
  doctorId: z.string().uuid(),
  chamberNumber: z.string().min(1, 'Chamber number is required'),
  dayOfWeek: z.number().int().min(1).max(7),
  sessionType: z.nativeEnum(SessionType),
  startTime: z.string().regex(timeRegex, 'startTime must be in HH:mm 24-hour format'),
  endTime: z.string().regex(timeRegex, 'endTime must be in HH:mm 24-hour format'),
  slotDurationMinutes: z.number().int().min(5).max(120).optional().default(15),
  maxWalkInTokens: z.number().int().min(0).optional().default(8),
  maxOnlineSlots: z.number().int().min(0).optional().default(8),
  bufferMinutes: z.number().int().min(0).optional().default(0),
});

const updateSessionSchema = z.object({
  chamberNumber: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  sessionType: z.nativeEnum(SessionType).optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  slotDurationMinutes: z.number().int().min(5).max(120).optional(),
  maxWalkInTokens: z.number().int().min(0).optional(),
  maxOnlineSlots: z.number().int().min(0).optional(),
  bufferMinutes: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function sessionRoutes(fastify: FastifyInstance) {
  /**
   * Schedule Clinic Session: POST /api/v1/clinic/sessions
   */
  fastify.post(
    '/clinic/sessions',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR],
        }),
      ],
    },
    async (req, reply) => {
      const parseResult = createSessionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const user = req.tenant;
      // Scoping: CLINIC_ADMIN must match their clinic
      if (user && user.activeRole === UserRole.CLINIC_ADMIN && user.activeClinicId) {
        if (parseResult.data.clinicId !== user.activeClinicId) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Clinic Admin can only manage sessions for their own clinic',
          });
        }
      }

      // DOCTOR can only manage their own sessions
      if (user && user.activeRole === UserRole.DOCTOR) {
        if (parseResult.data.doctorId !== user.userId) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Doctors can only configure their own clinical sessions',
          });
        }
      }

      try {
        const session = await sessionService.createSession(parseResult.data);
        return reply.status(201).send({
          success: true,
          message: 'Clinical session scheduled successfully',
          session,
        });
      } catch (err: any) {
        return reply.status(409).send({
          error: 'Session Conflict',
          message: err.message,
        });
      }
    }
  );

  /**
   * List Sessions for Clinic: GET /api/v1/clinic/sessions
   */
  fastify.get(
    '/clinic/sessions',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [
            UserRole.SUPER_ADMIN,
            UserRole.CLINIC_ADMIN,
            UserRole.RECEPTIONIST,
            UserRole.DOCTOR,
          ],
        }),
      ],
    },
    async (req, reply) => {
      const query = req.query as { clinicId?: string; dayOfWeek?: string; activeOnly?: string };
      const clinicId = query.clinicId || req.tenant?.activeClinicId;

      if (!clinicId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'clinicId query parameter or activeClinicId header required',
        });
      }

      const activeOnly = query.activeOnly !== 'false';

      if (query.dayOfWeek) {
        const day = parseInt(query.dayOfWeek, 10) as DayOfWeek;
        const sessions = await sessionService.getSessionsByDay(clinicId, day, activeOnly);
        return reply.send({
          success: true,
          clinicId,
          dayOfWeek: day,
          count: sessions.length,
          sessions,
        });
      }

      const sessions = await sessionService.getSessionsByClinic(clinicId, activeOnly);
      return reply.send({
        success: true,
        clinicId,
        count: sessions.length,
        sessions,
      });
    }
  );

  /**
   * Public Doctor Schedule Discovery: GET /api/v1/doctors/:doctorId/sessions
   */
  fastify.get('/doctors/:doctorId/sessions', async (req, reply) => {
    const { doctorId } = req.params as { doctorId: string };
    const query = req.query as { clinicId?: string };

    const sessions = await sessionService.getSessionsByDoctor(doctorId, query.clinicId, true);
    return reply.send({
      success: true,
      doctorId,
      count: sessions.length,
      sessions,
    });
  });

  /**
   * Update Clinical Session: PATCH /api/v1/clinic/sessions/:id
   */
  fastify.patch(
    '/clinic/sessions/:id',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR],
        }),
      ],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parseResult = updateSessionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      try {
        const updated = await sessionService.updateSession(id, parseResult.data);
        return reply.send({
          success: true,
          message: 'Session updated successfully',
          session: updated,
        });
      } catch (err: any) {
        return reply.status(400).send({
          error: 'Update Error',
          message: err.message,
        });
      }
    }
  );

  /**
   * Deactivate / Cancel Clinical Session: DELETE /api/v1/clinic/sessions/:id
   */
  fastify.delete(
    '/clinic/sessions/:id',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN],
        }),
      ],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const deactivated = await sessionService.deactivateSession(id);
        return reply.send({
          success: true,
          message: 'Clinical session cancelled/deactivated successfully',
          session: deactivated,
        });
      } catch (err: any) {
        return reply.status(404).send({
          error: 'Not Found',
          message: err.message,
        });
      }
    }
  );
}

