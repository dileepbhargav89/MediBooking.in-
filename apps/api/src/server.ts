/**
 * MediBooking Enterprise API Server
 * Fastify 5 core backend with multi-tenant context, Redis concurrency, and SSE streaming
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ENV } from './config/env';
import { doctorRoutes } from './routes/doctor.routes';
import { receptionRoutes } from './routes/reception.routes';
import { slotRoutes } from './routes/slot.routes';
import { realtimeRoutes } from './routes/realtime.routes';
import { authRoutes } from './routes/auth.routes';
import { clinicRoutes } from './routes/clinic.routes';
import { affiliationRoutes } from './routes/affiliation.routes';
import { sessionRoutes } from './routes/session.routes';
import { bookingRoutes } from './routes/booking.routes';
import { cashieringRoutes } from './routes/cashiering.routes';
import { compounderRoutes } from './routes/compounder.routes';
import { transitionRoutes } from './routes/transition.routes';
import { triageRoutes } from './routes/triage.routes';
import { sessionCancellationRoutes } from './routes/session-cancellation.routes';
import { rescheduleRoutes } from './routes/reschedule.routes';
import { notificationRoutes } from './routes/notification.routes';
import { auditRoutes } from './routes/audit.routes';
import { billingRoutes } from './routes/billing.routes';
import { hardwareRoutes } from './routes/hardware.routes';
import { SEED_DATA } from '@medibooking/database';

export function createApiServer(): FastifyInstance {
  const server = Fastify({
    logger: ENV.NODE_ENV !== 'test',
  });

  // Security headers & Cross-Origin Resource Sharing
  server.register(helmet, { contentSecurityPolicy: false });
  server.register(cors, { origin: true, credentials: true });

  // Health check endpoint
  server.get('/health', async () => ({
    status: 'ONLINE',
    service: 'MediBooking Enterprise API Gateway',
    timestamp: new Date().toISOString(),
    demoClinic: SEED_DATA.clinic.name,
    chambersCount: SEED_DATA.chambers.length,
    doctorsCount: SEED_DATA.doctors.length,
  }));

  // API v1 Routes
  server.register(
    async (v1) => {
      v1.register(doctorRoutes);
      v1.register(receptionRoutes);
      v1.register(slotRoutes);
      v1.register(realtimeRoutes);
      v1.register(authRoutes);
      v1.register(clinicRoutes);
      v1.register(affiliationRoutes);
      v1.register(sessionRoutes);
      v1.register(bookingRoutes);
      v1.register(cashieringRoutes);
      v1.register(compounderRoutes);
      v1.register(transitionRoutes);
      v1.register(triageRoutes);
      v1.register(sessionCancellationRoutes);
      v1.register(rescheduleRoutes);
      v1.register(notificationRoutes);
      v1.register(auditRoutes);
      v1.register(billingRoutes);
      v1.register(hardwareRoutes);
    },
    { prefix: '/api/v1' }
  );

  return server;
}

// Start server when executed directly
if (require.main === module) {
  const app = createApiServer();
  app.listen({ port: ENV.PORT, host: ENV.HOST }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`\n======================================================`);
    console.log(` MediBooking Enterprise API Server Online`);
    console.log(` Listening on: ${address}`);
    console.log(` Health check: ${address}/health`);
    console.log(` Waiting Room TV Stream: ${address}/api/v1/realtime/clinics/${SEED_DATA.clinic.id}/tv-stream`);
    console.log(`======================================================\n`);
  });
}
