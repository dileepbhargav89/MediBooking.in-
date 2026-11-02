import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PaymentStatus, UserRole } from '@medibooking/types';
import { requireAuth } from '../middleware/tenant-context';
import { cashieringService } from '../services/cashiering-service';

const processPaymentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  paymentMethod: z.enum([
    PaymentStatus.PAID_CASH,
    PaymentStatus.PAID_UPI_QR,
    PaymentStatus.WAIVED_BY_DOCTOR,
  ]),
  amountRupees: z.number().min(0, 'Amount must be non-negative').optional(),
  notes: z.string().max(250).optional(),
});

const queryLedgerSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  doctorId: z.string().optional(),
  paymentMethod: z
    .enum([
      PaymentStatus.PENDING_AT_DESK,
      PaymentStatus.PAID_CASH,
      PaymentStatus.PAID_UPI_QR,
      PaymentStatus.WAIVED_BY_DOCTOR,
    ])
    .optional(),
});

const querySummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export async function cashieringRoutes(fastify: FastifyInstance) {
  /**
   * Process & Settle Direct Clinic Payment
   * POST /api/v1/cashiering/pay
   */
  fastify.post(
    '/cashiering/pay',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const user = req.tenant!;
      const parseResult = processPaymentSchema.safeParse(req.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid cashiering payload',
          details: parseResult.error.errors,
        });
      }

      try {
        const result = await cashieringService.processPayment(
          user.activeClinicId!,
          parseResult.data,
          {
            userId: user.userId,
            role: user.activeRole,
            name: user.fullName || 'Front Desk Staff',
            staffScope: user.staffScope,
            dedicatedDoctorId: user.dedicatedDoctorId,
          }
        );

        return reply.status(200).send({
          statusCode: 200,
          message: `Payment successfully settled via ${parseResult.data.paymentMethod}`,
          appointment: result.appointment,
          ledgerEntry: result.ledgerEntry,
          receipt: result.receiptData,
        });
      } catch (err: any) {
        const msg = err.message || 'Payment processing failed';
        if (msg.includes('not found')) {
          return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: msg });
        }
        if (msg.includes('Forbidden') || msg.includes('Unauthorized')) {
          return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: msg });
        }
        if (msg.includes('PAYMENT_ALREADY_SETTLED')) {
          return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: msg });
        }
        return reply.status(500).send({ statusCode: 500, error: 'Internal Server Error', message: msg });
      }
    }
  );

  /**
   * Query Clinic Payment Ledger
   * GET /api/v1/cashiering/ledger
   */
  fastify.get(
    '/cashiering/ledger',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const user = req.tenant!;
      const parseResult = queryLedgerSchema.safeParse(req.query);

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid query filters',
          details: parseResult.error.errors,
        });
      }

      const entries = cashieringService.getLedgerEntries(
        user.activeClinicId!,
        parseResult.data,
        {
          staffScope: user.staffScope,
          dedicatedDoctorId: user.dedicatedDoctorId,
        }
      );

      return reply.status(200).send({
        statusCode: 200,
        clinicId: user.activeClinicId,
        count: entries.length,
        entries,
      });
    }
  );

  /**
   * Daily Cash Drawer & Cashiering Summary
   * GET /api/v1/cashiering/summary
   */
  fastify.get(
    '/cashiering/summary',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.SUPER_ADMIN],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const user = req.tenant!;
      const parseResult = querySummarySchema.safeParse(req.query);

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid query filters',
          details: parseResult.error.errors,
        });
      }

      const summary = await cashieringService.getCashDrawerSummary(
        user.activeClinicId!,
        parseResult.data.date,
        {
          staffScope: user.staffScope,
          dedicatedDoctorId: user.dedicatedDoctorId,
        }
      );

      return reply.status(200).send({
        statusCode: 200,
        summary,
      });
    }
  );
}
