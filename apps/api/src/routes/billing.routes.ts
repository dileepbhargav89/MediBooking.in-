import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { billingService, PLANS } from '../services/billing-service';
import { revenueSettlementService } from '../services/revenue-settlement-service';
import { PlanTier } from '@medibooking/types';

const createOrderSchema = z.object({
  clinicId: z.string().uuid(),
  tier: z.enum(['TRIAL_30', 'SOLO_ESSENTIAL', 'CLINIC_PRO', 'POLYCLINIC_ENTERPRISE']),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']).optional().default('MONTHLY'),
});

const verifyPaymentSchema = z.object({
  clinicId: z.string().uuid(),
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
  tier: z.enum(['TRIAL_30', 'SOLO_ESSENTIAL', 'CLINIC_PRO', 'POLYCLINIC_ENTERPRISE']),
});

export async function billingRoutes(fastify: FastifyInstance) {
  /**
   * Get Clinic Subscription & Entitlements: GET /api/v1/billing/subscriptions/:clinicId
   */
  fastify.get('/billing/subscriptions/:clinicId', async (req, reply) => {
    const { clinicId } = req.params as { clinicId: string };
    if (!clinicId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Missing clinicId parameter' });
    }

    const subscription = billingService.getOrCreateSubscription(clinicId);
    const invoices = billingService.getInvoices(clinicId);

    return reply.status(200).send({
      success: true,
      subscription,
      invoices,
      availablePlans: Object.values(PLANS),
    });
  });

  /**
   * Create Razorpay Payment Order: POST /api/v1/billing/razorpay/create-order
   */
  fastify.post('/billing/razorpay/create-order', async (req, reply) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid Razorpay order request payload',
        details: parsed.error.errors,
      });
    }

    try {
      const order = await billingService.createRazorpayOrder(
        parsed.data.clinicId,
        parsed.data.tier as PlanTier,
        parsed.data.billingCycle
      );

      return reply.status(200).send({
        success: true,
        order,
      });
    } catch (err: any) {
      return reply.status(400).send({ error: 'Bad Request', message: err.message });
    }
  });

  /**
   * Verify Razorpay Payment & Renew Subscription: POST /api/v1/billing/razorpay/verify-payment
   */
  fastify.post('/billing/razorpay/verify-payment', async (req, reply) => {
    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid Razorpay verification payload',
        details: parsed.error.errors,
      });
    }

    try {
      const result = await billingService.verifyPaymentAndRenew({
        clinicId: parsed.data.clinicId,
        orderId: parsed.data.orderId,
        paymentId: parsed.data.paymentId,
        signature: parsed.data.signature,
        tier: parsed.data.tier as PlanTier,
      });

      return reply.status(200).send({
        success: true,
        subscription: result.subscription,
        invoice: result.invoice,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Payment Verification Failed',
        message: err.message,
      });
    }
  });

  /**
   * Razorpay Webhook Endpoint: POST /api/v1/billing/razorpay/webhook
   */
  fastify.post('/billing/razorpay/webhook', async (req, reply) => {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (signature) {
      const isValid = billingService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return reply.status(400).send({ error: 'Invalid Webhook Signature' });
      }
    }

    const event = req.body as any;
    const result = await billingService.handleWebhook(event);

    return reply.status(200).send({
      success: true,
      result,
    });
  });

  /**
   * Phase 55: Get Polyclinic Doctor Revenue Split & Settlement Ledger
   * GET /api/v1/billing/settlements/daily-split
   */
  fastify.get('/billing/settlements/daily-split', async (req, reply) => {
    const query = req.query as { clinicId?: string; date?: string };
    const clinicId = query.clinicId || 'c1010000-0000-4000-8000-000000000001';
    const summary = revenueSettlementService.getDailyRevenueSplit(clinicId, query.date);

    return reply.status(200).send({
      success: true,
      summary,
    });
  });

  /**
   * Phase 55: Generate Bank NEFT / CMS Batch Payout CSV
   * POST /api/v1/billing/settlements/generate-neft-batch
   */
  fastify.post('/billing/settlements/generate-neft-batch', async (req, reply) => {
    const schema = z.object({
      clinicId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    const clinicId = parsed.success && parsed.data.clinicId
      ? parsed.data.clinicId
      : 'c1010000-0000-4000-8000-000000000001';

    const batch = revenueSettlementService.generateNeftCmsBatch(clinicId);

    return reply.status(200).send({
      success: true,
      ...batch,
    });
  });

  /**
   * Phase 55: Mark Doctor Settlement as Paid
   * POST /api/v1/billing/settlements/mark-settled
   */
  fastify.post('/billing/settlements/mark-settled', async (req, reply) => {
    const schema = z.object({
      clinicId: z.string().optional(),
      doctorId: z.string().min(1),
      utrNumber: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid settlement mark payload',
        details: parsed.error.format(),
      });
    }

    const clinicId = parsed.data.clinicId || 'c1010000-0000-4000-8000-000000000001';
    const settled = revenueSettlementService.markDoctorSettled(
      clinicId,
      parsed.data.doctorId,
      parsed.data.utrNumber
    );

    if (!settled) {
      return reply.status(404).send({ error: 'Not Found', message: 'Doctor settlement record not found' });
    }

    return reply.status(200).send({
      success: true,
      settlement: settled,
    });
  });
}

