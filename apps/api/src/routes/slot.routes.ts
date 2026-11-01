/**
 * Public Slot Discovery & Concurrency Locking Routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { slotLockManager } from '../services/concurrency-engine';

const lockSlotSchema = z.object({
  sessionId: z.string().min(8),
  ttlSeconds: z.number().int().min(60).max(600).optional().default(300),
});

export async function slotRoutes(fastify: FastifyInstance) {
  /**
   * Public Available Slots: GET /api/v1/public/clinics/:clinicId/doctors/:doctorId/slots
   */
  fastify.get('/public/clinics/:clinicId/doctors/:doctorId/slots', async (req) => {
    const { clinicId, doctorId } = req.params as { clinicId: string; doctorId: string };
    const query = req.query as { date?: string };
    const date = query.date || new Date().toISOString().split('T')[0];

    // Generate standard 15-minute slots for evening session 18:00 - 20:30
    const times = [
      '18:00', '18:15', '18:30', '18:45',
      '19:00', '19:15', '19:30', '19:45',
      '20:00', '20:15'
    ];

    const slots = times.map((t, idx) => {
      const slotId = `slot-${clinicId.slice(0, 4)}-${doctorId.slice(0, 4)}-${idx + 1}`;
      const locked = slotLockManager.isLocked(slotId);

      return {
        id: slotId,
        clinicId,
        doctorId,
        chamberNumber: 'CH-1',
        slotDate: date,
        startTime: `${date}T${t}:00+05:30`,
        isAvailable: !locked,
        status: locked ? 'LOCKED' : 'AVAILABLE',
      };
    });

    return {
      clinicId,
      doctorId,
      date,
      slots,
    };
  });

  /**
   * 5-Minute Atomic Mutex Lock: POST /api/v1/public/slots/:slotId/lock
   */
  fastify.post('/public/slots/:slotId/lock', async (req, reply) => {
    const { slotId } = req.params as { slotId: string };
    const parseResult = lockSlotSchema.safeParse(req.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    const { sessionId, ttlSeconds } = parseResult.data;
    const lockResult = await slotLockManager.acquireLock(slotId, sessionId, ttlSeconds);

    if (!lockResult.acquired) {
      return reply.status(409).send({
        error: 'Conflict',
        message: lockResult.message,
        ttlSecondsRemaining: lockResult.ttlSecondsRemaining,
      });
    }

    return {
      success: true,
      ...lockResult,
    };
  });

  /**
   * Release Mutex Lock: POST /api/v1/public/slots/:slotId/release
   */
  fastify.post('/public/slots/:slotId/release', async (req, reply) => {
    const { slotId } = req.params as { slotId: string };
    const { sessionId } = (req.body as { sessionId?: string }) || {};

    if (!sessionId) {
      return reply.status(400).send({ error: 'sessionId is required to release lock' });
    }

    const released = await slotLockManager.releaseLock(slotId, sessionId);
    return {
      success: released,
      message: released ? 'Slot lock released' : 'No active lock found for this session',
    };
  });
}

