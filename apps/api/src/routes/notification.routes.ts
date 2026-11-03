/**
 * Outbound Notifications API Routes (WhatsApp Business Cloud API)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { whatsappBroker } from '../services/whatsapp-broker';
import { smsGatewayBroker } from '../services/sms-broker';
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
}
