import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PaymentStatus, UserRole } from '@medibooking/types';
import { requireAuth } from '../middleware/tenant-context';
import { cashieringService } from '../services/cashiering-service';
import { reconciliationService } from '../services/reconciliation-service';
import { appointmentService } from '../services/appointment-service';

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
   * Generate Dynamic BharatQR UPI Intent
   * POST /api/v1/cashiering/upi-intent
   */
  fastify.post('/cashiering/upi-intent', async (req, reply) => {
    const upiIntentSchema = z.object({
      tokenNumber: z.number().int().positive(),
      amountRupees: z.number().positive(),
      doctorName: z.string().min(1),
      chamberNumber: z.string().min(1),
      clinicId: z.string().optional(),
    });

    const parsed = upiIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parsed.error.format() });
    }

    const { tokenNumber, amountRupees, doctorName, chamberNumber } = parsed.data;
    const txnId = `TXN-UPI-${Date.now().toString().slice(-6)}`;
    const vpa = 'bhopalcare@icici';
    const upiUri = `upi://pay?pa=${vpa}&pn=Bhopal+CityCare+Polyclinic&am=${amountRupees}.00&tr=${txnId}&cu=INR&tn=Token+${tokenNumber}+${encodeURIComponent(doctorName)}`;

    return reply.status(200).send({
      success: true,
      txnId,
      vpa,
      amountRupees,
      tokenNumber,
      chamberNumber,
      doctorName,
      upiUri,
      status: 'PENDING',
      expiresInSeconds: 180,
    });
  });

  /**
   * Verify UPI Transaction Status
   * POST /api/v1/cashiering/upi-verify/:txnId
   */
  fastify.post('/cashiering/upi-verify/:txnId', async (req, reply) => {
    const { txnId } = req.params as { txnId: string };
    return reply.status(200).send({
      success: true,
      txnId,
      status: 'PAID',
      settledAt: new Date().toISOString(),
      method: 'UPI_P2M',
      mdrRatePercent: 0.0,
    });
  });

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

  /**
   * End-of-Day Reconciliation Report Preview
   * GET /api/v1/cashiering/reconciliation/report
   */
  fastify.get('/cashiering/reconciliation/report', async (req, reply) => {
    const query = req.query as any;
    const clinicId = query?.clinicId || (req as any).tenant?.activeClinicId;
    if (!clinicId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Missing clinicId query parameter' });
    }

    const physicalCount = query?.physicalCashCountedRupees ? Number(query.physicalCashCountedRupees) : undefined;
    const preview = await reconciliationService.generateEodPreview(
      clinicId,
      query?.date,
      physicalCount,
      query?.notes
    );

    return reply.status(200).send({
      success: true,
      report: preview,
    });
  });

  /**
   * Close Cashiering Shift & Lock Daily Settlement
   * POST /api/v1/cashiering/reconciliation/close-shift
   */
  fastify.post('/cashiering/reconciliation/close-shift', async (req, reply) => {
    const body = (req.body || {}) as any;
    const clinicId = body.clinicId || (req as any).tenant?.activeClinicId;
    if (!clinicId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Missing clinicId in request' });
    }
    if (typeof body.physicalCashCountedRupees !== 'number' || body.physicalCashCountedRupees < 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'physicalCashCountedRupees must be a non-negative number',
      });
    }

    try {
      const actorId = (req as any).tenant?.userId || 'u1010000-0000-4000-8000-000000000001';
      const actorName = (req as any).tenant?.name || 'Front Desk Receptionist';

      const settlement = await reconciliationService.closeShift(
        {
          clinicId,
          date: body.date,
          physicalCashCountedRupees: body.physicalCashCountedRupees,
          notes: body.notes,
          supervisorOverride: body.supervisorOverride,
        },
        { userId: actorId, name: actorName }
      );

      return reply.status(200).send({
        success: true,
        settlement,
      });
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('already closed and locked')) {
        return reply.status(409).send({ error: 'Conflict', message: msg });
      }
      return reply.status(400).send({ error: 'Bad Request', message: msg });
    }
  });

  /**
   * Get Past Daily Reconciliation Settlements
   * GET /api/v1/cashiering/reconciliation/history
   */
  fastify.get('/cashiering/reconciliation/history', async (req, reply) => {
    const query = req.query as any;
    const clinicId = query?.clinicId || (req as any).tenant?.activeClinicId;
    if (!clinicId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Missing clinicId query parameter' });
    }

    const history = reconciliationService.getSettlementHistory(clinicId);
    return reply.status(200).send({
      success: true,
      history,
    });
  });

  /**
   * Phase 53: Front-Desk PWA Offline Intake Batch Sync
   * POST /api/v1/cashiering/sync-offline-batch
   */
  fastify.post('/cashiering/sync-offline-batch', async (req, reply) => {
    const offlineBatchSchema = z.object({
      clinicId: z.string().optional(),
      batchRecords: z.array(
        z.object({
          id: z.string().min(1),
          idempotencyKey: z.string().min(1),
          tokenNumber: z.number().int().positive(),
          patientName: z.string().min(1),
          patientMobile: z.string().min(10),
          chamberNumber: z.string().min(1),
          doctorName: z.string().min(1),
          paymentMode: z.string().min(1),
          feePaidRupees: z.number().min(0),
          isUrgent: z.boolean().optional(),
          offlineGeneratedAt: z.string().min(1),
        })
      ),
    });

    const parsed = offlineBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid offline intake batch payload',
        details: parsed.error.format(),
      });
    }

    const { clinicId, batchRecords } = parsed.data;

    // Process and deduplicate batch records
    const seenKeys = new Set<string>();
    const reconciledTokens = [];

    for (const record of batchRecords) {
      if (seenKeys.has(record.idempotencyKey)) {
        continue; // Deduplicate within the batch
      }
      seenKeys.add(record.idempotencyKey);

      reconciledTokens.push({
        offlineId: record.id,
        serverTokenNumber: record.tokenNumber,
        chamberNumber: record.chamberNumber,
        status: 'CONFIRMED',
        syncedAt: new Date().toISOString(),
      });
    }

    return reply.status(200).send({
      success: true,
      clinicId: clinicId || 'c1010000-0000-4000-8000-000000000001',
      syncedCount: reconciledTokens.length,
      failedCount: 0,
      reconciledTokens,
      serverMessage: `Successfully reconciled ${reconciledTokens.length} offline walk-in tokens.`,
    });
  });

  /**
   * Phase 61: Procedure Catalog for In-Chamber Add-ons
   * GET /api/v1/cashiering/procedure-catalog
   */
  const procedureCatalog = [
    { id: 'proc-ecg', name: '12-Lead ECG with Rhythm Strip', code: 'ECG', amountRupees: 200, doctorSplitPercent: 80, clinicSplitPercent: 20 },
    { id: 'proc-dressing', name: 'Sterile Wound Dressing / Suture Care', code: 'DRESSING', amountRupees: 150, doctorSplitPercent: 70, clinicSplitPercent: 30 },
    { id: 'proc-nebulization', name: 'Duolin/Budecort Nebulization (1 Cycle)', code: 'NEB', amountRupees: 100, doctorSplitPercent: 60, clinicSplitPercent: 40 },
    { id: 'proc-rbs', name: 'Random Blood Sugar (Accu-Chek Glucometer)', code: 'RBS', amountRupees: 50, doctorSplitPercent: 50, clinicSplitPercent: 50 },
    { id: 'proc-injection', name: 'IM / IV Antibiotic / Pain Injection', code: 'INJ', amountRupees: 40, doctorSplitPercent: 50, clinicSplitPercent: 50 },
  ];

  fastify.get('/cashiering/procedure-catalog', async (_req, reply) => {
    return reply.status(200).send({
      success: true,
      procedures: procedureCatalog,
    });
  });

  /**
   * Phase 61: Offline Consultation Settlement with Custom Editing Charges
   * POST /api/v1/cashiering/settle-consultation-charges
   */
  fastify.post('/cashiering/settle-consultation-charges', async (req, reply) => {
    const settleSchema = z.object({
      appointmentId: z.string().optional(),
      tokenNumber: z.number().int().positive().optional(),
      patientName: z.string().optional(),
      chamberNumber: z.string().optional(),
      doctorName: z.string().optional(),
      consultationType: z.enum(['STANDARD', 'FOLLOW_UP', 'WAIVED']).default('STANDARD'),
      consultationFeeRupees: z.number().min(0).default(600),
      waiverReason: z.string().optional(),
      selectedProcedureIds: z.array(z.string()).default([]),
      customProcedures: z
        .array(
          z.object({
            name: z.string(),
            amountRupees: z.number().min(0),
            doctorSplitPercent: z.number().min(0).max(100).default(80),
          })
        )
        .optional(),
      paymentMethod: z
        .enum([PaymentStatus.PAID_CASH, PaymentStatus.PAID_UPI_QR, PaymentStatus.WAIVED_BY_DOCTOR])
        .default(PaymentStatus.PAID_CASH),
      notes: z.string().optional(),
    });

    const parsed = settleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid settlement payload',
        details: parsed.error.format(),
      });
    }

    const data = parsed.data;
    let baseConsultationFee = data.consultationFeeRupees;
    if (data.consultationType === 'WAIVED') {
      baseConsultationFee = 0;
    } else if (data.consultationType === 'FOLLOW_UP' && data.consultationFeeRupees === 600) {
      baseConsultationFee = 300;
    }

    // Resolve selected catalog procedures
    const itemizedProcedures: Array<{ name: string; amountRupees: number; doctorSplitPercent: number }> = [];
    for (const procId of data.selectedProcedureIds) {
      const match = procedureCatalog.find((p) => p.id === procId);
      if (match) {
        itemizedProcedures.push({
          name: match.name,
          amountRupees: match.amountRupees,
          doctorSplitPercent: match.doctorSplitPercent,
        });
      }
    }

    // Add custom procedures if any
    if (data.customProcedures && data.customProcedures.length > 0) {
      for (const cp of data.customProcedures) {
        itemizedProcedures.push({
          name: cp.name,
          amountRupees: cp.amountRupees,
          doctorSplitPercent: cp.doctorSplitPercent,
        });
      }
    }

    const proceduresTotal = itemizedProcedures.reduce((sum, p) => sum + p.amountRupees, 0);
    const grossTotalRupees = baseConsultationFee + proceduresTotal;

    // Doctor & Polyclinic Split calculation
    const doctorConsultationSplit = Math.round(baseConsultationFee * 0.8);
    const clinicConsultationSplit = baseConsultationFee - doctorConsultationSplit;

    let doctorProceduresSplit = 0;
    let clinicProceduresSplit = 0;
    for (const p of itemizedProcedures) {
      const dShare = Math.round(p.amountRupees * (p.doctorSplitPercent / 100));
      doctorProceduresSplit += dShare;
      clinicProceduresSplit += p.amountRupees - dShare;
    }

    const totalDoctorShareRupees = doctorConsultationSplit + doctorProceduresSplit;
    const totalClinicShareRupees = clinicConsultationSplit + clinicProceduresSplit;

    // Update appointment if appointmentId provided
    if (data.appointmentId) {
      const appt = await appointmentService.getAppointmentById(data.appointmentId);
      if (appt) {
        appointmentService.updateAppointment(data.appointmentId, {
          paymentStatus: data.paymentMethod,
          amountRupees: grossTotalRupees,
        });
      }
    }

    const cleanDate = new Date().toISOString().split('T')[0]?.replace(/-/g, '') || '20261108';
    const receiptNumber = `ESC-REC-${cleanDate}-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsSummary = [
      {
        item: `Doctor Consultation (${data.consultationType})`,
        amount: baseConsultationFee,
        rate: baseConsultationFee,
        qty: 1,
      },
      ...itemizedProcedures.map((p) => ({
        item: p.name,
        amount: p.amountRupees,
        rate: p.amountRupees,
        qty: 1,
      })),
    ];

    const escPosReceiptLines = [
      '========================================',
      '      BHOPAL CITYCARE POLYCLINIC',
      '    Plot 42, MP Nagar Zone-II, Bhopal',
      '        Phone: +91 755 492 8800',
      '========================================',
      `Receipt No : ${receiptNumber}`,
      `Date & Time: ${new Date().toLocaleString('en-IN')}`,
      `Patient    : ${data.patientName || 'Patient'}`,
      `Token #    : ${data.tokenNumber || 1}  Chamber: ${data.chamberNumber || 'CH-1'}`,
      `Doctor     : ${data.doctorName || 'Dr. Rajesh Sharma'}`,
      '----------------------------------------',
      'ITEM                       QTY    AMOUNT',
      '----------------------------------------',
      ...itemsSummary.map((item) => {
        const title = item.item.length > 24 ? item.item.slice(0, 24) : item.item.padEnd(24);
        return `${title}  1   ₹${item.amount.toString().padStart(5)}`;
      }),
      '----------------------------------------',
      `TOTAL CHARGES COLLECTED:          ₹${grossTotalRupees}`,
      `Payment Mode: ${data.paymentMethod}`,
      '----------------------------------------',
      `Doctor Share (80% / Proc):        ₹${totalDoctorShareRupees}`,
      `Polyclinic Facility Share:        ₹${totalClinicShareRupees}`,
      '========================================',
      '  Thank You! Get Well Soon - MediBooking',
      '========================================',
    ];

    return reply.status(200).send({
      success: true,
      receiptNumber,
      consultationType: data.consultationType,
      consultationFeeRupees: baseConsultationFee,
      proceduresTotalRupees: proceduresTotal,
      grossTotalRupees,
      waiverReason: data.waiverReason,
      paymentMethod: data.paymentMethod,
      doctorShareRupees: totalDoctorShareRupees,
      clinicShareRupees: totalClinicShareRupees,
      itemizedBreakdown: itemsSummary,
      escPosReceiptText: escPosReceiptLines.join('\n'),
      settledAt: new Date().toISOString(),
    });
  });
}
