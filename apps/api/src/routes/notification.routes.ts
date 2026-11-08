/**
 * Outbound Notifications API Routes (WhatsApp Business Cloud API)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { whatsappBroker } from '../services/whatsapp-broker';
import { smsGatewayBroker } from '../services/sms-broker';
import { dltSmsFailoverGateway, DltSmsProvider } from '../services/dlt-sms-failover-gateway';
import { whatsAppTwoWayBotService } from '../services/whatsapp-two-way-bot';
import { WhatsAppTemplateType, SmsTemplateType } from '@medibooking/types';

const sendNotificationSchema = z.object({
  recipientMobile: z.string().min(10),
  template: z.enum([
    'booking_confirmation_v1',
    'doctor_delay_v1',
    'session_cancelled_v1',
    'walkin_intake_v1',
    'custom_utility_v1',
  ]),
  language: z.string().optional().default('en_US'),
  parameters: z.record(z.any()),
  clinicId: z.string().uuid(),
  appointmentId: z.string().optional(),
  simulate: z.boolean().optional(),
});

const sendSmsSchema = z.object({
  recipientMobile: z.string().min(10),
  templateType: z.enum([
    'BOOKING_CONFIRMATION',
    'DOCTOR_DELAY',
    'SESSION_CANCELLED',
    'WALKIN_INTAKE',
    'OTP_LOGIN',
  ]),
  variables: z.array(z.string()),
  clinicId: z.string().uuid(),
  referenceId: z.string().optional(),
  simulate: z.boolean().optional(),
});

export async function notificationRoutes(fastify: FastifyInstance) {
  /**
   * Send WhatsApp Notification: POST /api/v1/notifications/whatsapp/send
   */
  fastify.post('/notifications/whatsapp/send', async (req, reply) => {
    const parsed = sendNotificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid WhatsApp notification payload',
        details: parsed.error.errors,
      });
    }

    const result = await whatsappBroker.sendNotification({
      ...parsed.data,
      template: parsed.data.template as WhatsAppTemplateType,
    });

    return reply.status(200).send({
      success: result.success,
      result,
    });
  });

  /**
   * Get WhatsApp Audit History: GET /api/v1/notifications/whatsapp/history
   */
  fastify.get('/notifications/whatsapp/history', async (req) => {
    const { clinicId } = (req.query || {}) as { clinicId?: string };
    const history = whatsappBroker.getHistory(clinicId);
    return {
      total: history.length,
      history,
    };
  });

  /**
   * Developer Test Ping: POST /api/v1/notifications/whatsapp/test
   */
  fastify.post('/notifications/whatsapp/test', async (req, reply) => {
    const { mobile, clinicId } = (req.body || {}) as { mobile?: string; clinicId?: string };
    const targetMobile = mobile || '9826012345';
    const targetClinicId = clinicId || 'c1010000-0000-4000-8000-000000000001';

    const result = await whatsappBroker.sendNotification({
      recipientMobile: targetMobile,
      template: 'booking_confirmation_v1',
      parameters: {
        patientName: 'Priya Sharma',
        doctorName: 'Dr. Rajesh Sharma',
        specialty: 'Cardiology',
        chamberNumber: 'CH-1',
        tokenNumber: 5,
        appointmentTime: 'Today at 6:30 PM',
      },
      clinicId: targetClinicId,
      simulate: true,
    });

    return reply.status(200).send({
      success: result.success,
      message: 'WhatsApp notification test completed',
      result,
    });
  });

  /**
   * Send DLT-Compliant SMS: POST /api/v1/notifications/sms/send
   */
  fastify.post('/notifications/sms/send', async (req, reply) => {
    const parsed = sendSmsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid DLT SMS notification payload',
        details: parsed.error.errors,
      });
    }

    try {
      const result = await smsGatewayBroker.sendSms({
        ...parsed.data,
        templateType: parsed.data.templateType as SmsTemplateType,
      });

      return reply.status(200).send({
        success: result.success,
        result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'SMS processing error',
      });
    }
  });

  /**
   * Get SMS Audit History: GET /api/v1/notifications/sms/history
   */
  fastify.get('/notifications/sms/history', async (req) => {
    const { clinicId } = (req.query || {}) as { clinicId?: string };
    const history = smsGatewayBroker.getHistory(clinicId);
    return {
      total: history.length,
      history,
    };
  });

  /**
   * Developer SMS Test Ping: POST /api/v1/notifications/sms/test
   */
  fastify.post('/notifications/sms/test', async (req, reply) => {
    const { mobile, clinicId } = (req.body || {}) as { mobile?: string; clinicId?: string };
    const targetMobile = mobile || '9826012345';
    const targetClinicId = clinicId || 'c1010000-0000-4000-8000-000000000001';

    try {
      const result = await smsGatewayBroker.sendSms({
        recipientMobile: targetMobile,
        templateType: 'BOOKING_CONFIRMATION',
        variables: ['Rajesh Sharma', '10:30 AM', '12', 'Apex Care Polyclinic'],
        clinicId: targetClinicId,
        simulate: true,
      });

      return reply.status(200).send({
        success: result.success,
        message: 'DLT SMS test completed',
        result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message,
      });
    }
  });

  /**
   * Multi-Provider DLT SMS Failover Dispatch: POST /api/v1/notifications/sms/failover-send
   */
  fastify.post('/notifications/sms/failover-send', async (req, reply) => {
    const failoverSchema = z.object({
      recipientMobile: z.string().min(10),
      templateType: z.enum([
        'BOOKING_CONFIRMATION',
        'DOCTOR_DELAY',
        'SESSION_CANCELLED',
        'WALKIN_INTAKE',
        'OTP_LOGIN',
      ]),
      variables: z.array(z.string()),
      clinicId: z.string(),
      referenceId: z.string().optional(),
      forceProviderFailure: z.array(z.enum([
        'GUPSHUP_ENTERPRISE_DLT',
        'EXOTEL_TELECOM_DLT',
        'TWILIO_GLOBAL_DLT',
      ])).optional(),
    });

    const parsed = failoverSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid DLT SMS failover payload',
        details: parsed.error.errors,
      });
    }

    try {
      const result = await dltSmsFailoverGateway.sendWithFailover({
        ...parsed.data,
        templateType: parsed.data.templateType as SmsTemplateType,
        forceProviderFailure: parsed.data.forceProviderFailure as DltSmsProvider[] | undefined,
      });

      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: err.message || 'All DLT SMS carriers failed',
      });
    }
  });

  /**
   * Get Carrier Circuit Breaker Status: GET /api/v1/notifications/sms/circuit-status
   */
  fastify.get('/notifications/sms/circuit-status', async (_req, reply) => {
    const circuits = dltSmsFailoverGateway.getCircuitStatus();
    return reply.status(200).send({
      statusCode: 200,
      circuits,
      activeCarriersCount: Object.keys(circuits).length,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Phase 54: Meta WhatsApp Cloud API Webhook Handshake Verification
   * GET /api/v1/whatsapp/webhook
   */
  fastify.get('/whatsapp/webhook', async (req, reply) => {
    const query = req.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };

    const mode = query['hub.mode'] || '';
    const token = query['hub.verify_token'] || '';
    const challenge = query['hub.challenge'] || '';

    const verifiedChallenge = whatsAppTwoWayBotService.verifyHandshake(mode, token, challenge);
    if (verifiedChallenge) {
      return reply.status(200).send(verifiedChallenge);
    }
    return reply.status(403).send({ error: 'Forbidden', message: 'Webhook handshake verification failed' });
  });

  /**
   * Phase 54: Meta WhatsApp Cloud API Inbound Webhook Processor
   * POST /api/v1/whatsapp/webhook
   */
  fastify.post('/whatsapp/webhook', async (req, reply) => {
    const replies = whatsAppTwoWayBotService.parseMetaWebhookBody(req.body);
    return reply.status(200).send({
      success: true,
      processedCount: replies.length,
      replies,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Phase 54: Inbound Two-Way WhatsApp Interactive Simulation
   * POST /api/v1/whatsapp/simulate-inbound
   */
  fastify.post('/whatsapp/simulate-inbound', async (req, reply) => {
    const inboundSchema = z.object({
      senderMobile: z.string().min(10),
      messageText: z.string().min(1),
    });

    const parsed = inboundSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid inbound message simulation payload',
        details: parsed.error.format(),
      });
    }

    const botReply = whatsAppTwoWayBotService.handleMessage(
      parsed.data.senderMobile,
      parsed.data.messageText
    );

    return reply.status(200).send({
      success: true,
      botReply,
    });
  });

  /**
   * Phase 60: WhatsApp Interactive 1-Tap Patient Onboarding Gateway
   * POST /api/v1/whatsapp/patient-onboard
   */
  fastify.post('/whatsapp/patient-onboard', async (req, reply) => {
    const onboardSchema = z.object({
      mobile: z.string().min(10),
      patientName: z.string().optional(),
      doctorId: z.string().optional(),
      chamberNumber: z.string().optional().default('CH-1'),
      dpdpConsent: z.boolean(),
      language: z.enum(['en', 'hi']).optional().default('hi'),
    });

    const parsed = onboardSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid patient onboarding payload',
        details: parsed.error.format(),
      });
    }

    if (!parsed.data.dpdpConsent) {
      return reply.status(400).send({
        error: 'DPDP Consent Required',
        message: 'Digital Personal Data Protection (DPDP) Act 2023 explicit consent is required for automated WhatsApp onboarding.',
      });
    }

    try {
      const result = whatsAppTwoWayBotService.onboardPatient({
        mobile: parsed.data.mobile,
        patientName: parsed.data.patientName,
        doctorId: parsed.data.doctorId,
        chamberNumber: parsed.data.chamberNumber,
        dpdpConsent: parsed.data.dpdpConsent,
        language: parsed.data.language,
      });

      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Onboarding Error',
        message: err.message,
      });
    }
  });

  /**
   * Phase 60: WhatsApp Active Queue Query
   * GET /api/v1/whatsapp/active-queue
   */
  fastify.get('/whatsapp/active-queue', async (_req, reply) => {
    const queue = whatsAppTwoWayBotService.getAllActiveTokens();
    return reply.status(200).send({
      success: true,
      count: Object.keys(queue).length,
      queue,
    });
  });
}
