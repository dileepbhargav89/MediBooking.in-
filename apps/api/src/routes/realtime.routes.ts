/**
 * Real-time SSE TV Feed & Waiting Room Snapshot Routes
 */

import { FastifyInstance } from 'fastify';
import { realtimeStreamManager } from '../services/realtime-sse';

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
}

