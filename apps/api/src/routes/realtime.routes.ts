/**
 * Real-time SSE TV Feed & Multi-Instance Redis Pub/Sub Routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { realtimeStreamManager } from '../services/realtime-sse';
import { pubsubBroker } from '../services/pubsub-broker';
import { RealtimeEventType } from '@medibooking/types';

const publishSchema = z.object({
  clinicId: z.string().uuid(),
  eventType: z.enum([
    'chamber_update',
    'delay_broadcast',
    'session_cancelled',
    'emergency_triage',
    'queue_refresh',
    'heartbeat',
  ]),
  payload: z.record(z.any()),
});

export async function realtimeRoutes(fastify: FastifyInstance) {
  /**
   * Waiting Room TV SSE Stream: GET /api/v1/realtime/clinics/:clinicId/tv-stream
   */
  fastify.get('/realtime/clinics/:clinicId/tv-stream', (req, reply) => {
    const { clinicId } = req.params as { clinicId: string };
    realtimeStreamManager.subscribe(clinicId, reply);
  });

  /**
   * Waiting Room Snapshot (JSON): GET /api/v1/realtime/clinics/:clinicId/snapshot
   */
  fastify.get('/realtime/clinics/:clinicId/snapshot', async (req) => {
    const { clinicId } = req.params as { clinicId: string };
    return realtimeStreamManager.getClinicSnapshot(clinicId);
  });

  /**
   * Publish Event to Redis Backplane: POST /api/v1/realtime/publish
   */
  fastify.post('/realtime/publish', async (req, reply) => {
    const parsed = publishSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid real-time event payload',
        details: parsed.error.errors,
      });
    }

    const { clinicId, eventType, payload } = parsed.data;
    const event = await pubsubBroker.publishClinicEvent(
      clinicId,
      eventType as RealtimeEventType,
      payload
    );

    return {
      success: true,
      event,
    };
  });

  /**
   * Diagnostic Cluster Stats: GET /api/v1/realtime/stats
   */
  fastify.get('/realtime/stats', async () => {
    return {
      ...pubsubBroker.getStats(),
      localConnectedClients: realtimeStreamManager.getConnectedClientCount(),
    };
  });

  /**
   * Trigger Manual Heartbeat Ping: POST /api/v1/realtime/clinics/:clinicId/heartbeat
   */
  fastify.post('/realtime/clinics/:clinicId/heartbeat', async (req) => {
    const { clinicId } = req.params as { clinicId: string };
    realtimeStreamManager.broadcastHeartbeat(clinicId);
    return { success: true, message: 'Heartbeat broadcasted' };
  });
}
