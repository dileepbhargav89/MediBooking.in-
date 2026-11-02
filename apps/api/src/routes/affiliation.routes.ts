/**
 * Clinic-Doctor Affiliation, Chamber Assignment & Differential Fee Matrix Routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { affiliationService } from '../services/affiliation-service';
import { requireAuth } from '../middleware/tenant-context';
import { UserRole } from '@medibooking/types';

const createAffiliationSchema = z.object({
  clinicId: z.string().uuid(),
  doctorId: z.string().uuid(),
  chamberId: z.string().uuid().optional(),
  chamberNumber: z.string().min(1, 'Chamber number is required'),
  consultationFeeRupees: z.number().min(0, 'Consultation fee must be non-negative').optional(),
  followUpFeeRupees: z.number().min(0, 'Follow-up fee must be non-negative').optional(),
  followUpValidityDays: z.number().int().min(0, 'Validity days must be non-negative').optional(),
  isPrimaryClinic: z.boolean().optional(),
});

const updateAffiliationSchema = z.object({
  chamberId: z.string().uuid().optional(),
  chamberNumber: z.string().min(1).optional(),
  consultationFeeRupees: z.number().min(0).optional(),
  followUpFeeRupees: z.number().min(0).optional(),
  followUpValidityDays: z.number().int().min(0).optional(),
  isPrimaryClinic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function affiliationRoutes(fastify: FastifyInstance) {
  /**
   * Affiliate Doctor to Clinic: POST /api/v1/clinic/affiliations
   * Restricted to CLINIC_ADMIN or SUPER_ADMIN
   */
  fastify.post(
    '/clinic/affiliations',
    {
      preHandler: [requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] })],
    },
    async (req, reply) => {
      const parseResult = createAffiliationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const user = req.tenant;
      // CLINIC_ADMIN can only affiliate within their own active clinic unless SUPER_ADMIN
      if (user && user.activeRole === UserRole.CLINIC_ADMIN && user.activeClinicId) {
        if (parseResult.data.clinicId !== user.activeClinicId) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Clinic Admin can only manage affiliations for their own clinic',
          });
        }
      }

      try {
        const affiliation = await affiliationService.affiliateDoctor(parseResult.data);
        return reply.status(201).send({
          success: true,
          message: `Doctor successfully affiliated with chamber ${affiliation.chamberNumber}`,
          affiliation,
        });
      } catch (err: any) {
        return reply.status(400).send({
          error: 'Affiliation Error',
          message: err.message,
        });
      }
    }
  );

  /**
   * List Affiliated Doctors for Clinic: GET /api/v1/clinic/affiliations
   * Query param: clinicId (optional if present in userContext)
   */
  fastify.get(
    '/clinic/affiliations',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [
            UserRole.SUPER_ADMIN,
            UserRole.CLINIC_ADMIN,
            UserRole.RECEPTIONIST,
            UserRole.DOCTOR,
          ],
        }),
      ],
    },
    async (req, reply) => {
      const query = req.query as { clinicId?: string; activeOnly?: string };
      const clinicId = query.clinicId || req.tenant?.activeClinicId;

      if (!clinicId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'clinicId query parameter or activeClinicId header required',
        });
      }

      const activeOnly = query.activeOnly !== 'false';
      const affiliations = await affiliationService.getAffiliationsByClinic(clinicId, activeOnly);

      return reply.send({
        success: true,
        clinicId,
        count: affiliations.length,
        affiliations,
      });
    }
  );

  /**
   * Update Affiliation Details: PATCH /api/v1/clinic/affiliations/:doctorId
   */
  fastify.patch(
    '/clinic/affiliations/:doctorId',
    {
      preHandler: [requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] })],
    },
    async (req, reply) => {
      const { doctorId } = req.params as { doctorId: string };
      const query = req.query as { clinicId?: string };
      const clinicId = query.clinicId || req.tenant?.activeClinicId;

      if (!clinicId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'clinicId query parameter or activeClinicId header required',
        });
      }

      const parseResult = updateAffiliationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      try {
        const updated = await affiliationService.updateAffiliation(clinicId, doctorId, parseResult.data);
        return reply.send({
          success: true,
          message: 'Affiliation updated successfully',
          affiliation: updated,
        });
      } catch (err: any) {
        return reply.status(404).send({
          error: 'Not Found',
          message: err.message,
        });
      }
    }
  );

  /**
   * Public / Doctor Multi-Venue Lookups: GET /api/v1/doctors/:doctorId/affiliations
   * Returns all clinics where this doctor practices
   */
  fastify.get('/doctors/:doctorId/affiliations', async (req, reply) => {
    const { doctorId } = req.params as { doctorId: string };
    const affiliations = await affiliationService.getAffiliationsByDoctor(doctorId, true);

    return reply.send({
      success: true,
      doctorId,
      count: affiliations.length,
      affiliations,
    });
  });
}
