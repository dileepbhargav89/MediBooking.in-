import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dpdpAuditService } from '../services/dpdp-audit-service';
import { UserRole, DpdpAuditAction, LawfulBasis } from '@medibooking/types';

const createLogSchema = z.object({
  clinicId: z.string().uuid(),
  actorId: z.string().uuid(),
  actorRole: z.nativeEnum(UserRole),
  action: z.enum([
    'PATIENT_INTAKE',
    'DATA_ACCESS',
    'DATA_EXPORT',
    'CONSENT_RECORDED',
    'DATA_ERASURE_REQUEST',
    'PAYMENT_COLLECTED',
    'EMERGENCY_OVERRIDE',
    'DELAY_BROADCAST',
    'SESSION_CANCELLED',
    'USER_LOGIN',
    'SECURITY_ALERT',
  ]),
  entityType: z.string(),
  entityId: z.string(),
  lawfulBasis: z
    .enum(['CONSENT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'LEGITIMATE_USES'])
    .optional()
    .default('CONSENT'),
  details: z.record(z.any()).optional().default({}),
  clientIp: z.string().optional(),
});

export async function auditRoutes(fastify: FastifyInstance) {
  /**
   * Log an Immutable DPDP Audit Action: POST /api/v1/audit/log
   */
  fastify.post('/audit/log', async (req, reply) => {
    const parsed = createLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid DPDP audit log payload',
        details: parsed.error.errors,
      });
    }

    const entry = await dpdpAuditService.logAction({
      ...parsed.data,
      actorRole: parsed.data.actorRole as UserRole,
      action: parsed.data.action as DpdpAuditAction,
      lawfulBasis: parsed.data.lawfulBasis as LawfulBasis,
    });

    return reply.status(201).send({
      success: true,
      entry,
    });
  });

  /**
   * Query Clinic Audit Ledger: GET /api/v1/audit/logs
   */
  fastify.get('/audit/logs', async (req, reply) => {
    const query = req.query as any;
    if (!query || !query.clinicId) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing required query parameter: clinicId',
      });
    }

    const result = dpdpAuditService.queryLogs({
      clinicId: query.clinicId,
      action: query.action as DpdpAuditAction | undefined,
      actorRole: query.actorRole as UserRole | undefined,
      fromDate: query.fromDate,
      toDate: query.toDate,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    });

    return reply.status(200).send({
      success: true,
      clinicId: query.clinicId,
      total: result.total,
      entries: result.entries,
    });
  });

  /**
   * Cryptographically Verify Audit Chain Integrity: GET /api/v1/audit/verify
   */
  fastify.get('/audit/verify', async (req, reply) => {
    const { clinicId } = (req.query || {}) as { clinicId?: string };
    if (!clinicId) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing required query parameter: clinicId',
      });
    }

    const verification = dpdpAuditService.verifyChain(clinicId);
    return reply.status(200).send({
      success: true,
      verification,
    });
  });
}
