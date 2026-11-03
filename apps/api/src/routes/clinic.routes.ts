/**
 * Clinic Tenant & Multi-Chamber Administration Routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { clinicService } from '../services/clinic-service';
import { requireAuth, requireTenantMatch } from '../middleware/tenant-context';
import { UserRole } from '@medibooking/types';

const createClinicSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(2).optional(),
  tagline: z.string().optional(),
  addressLine: z.string().min(5),
  locality: z.string().min(2),
  city: z.string().default('Bhopal'),
  state: z.string().default('Madhya Pradesh'),
  pincode: z.string().regex(/^\d{6}$/, 'Must be a valid 6-digit Indian PIN code'),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a 10-digit Indian mobile number'),
  contactEmail: z.string().email().optional(),
  initialChambersCount: z.number().int().min(1).max(20).optional().default(4),
});

const createChamberSchema = z.object({
  chamberNumber: z.string().regex(/^[A-Za-z0-9-]+$/, 'Must be alphanumeric chamber code (e.g. CH-1, ROOM-2)'),
  chamberName: z.string().min(2),
  floor: z.string().optional().default('Ground Floor'),
});

const updateChamberSchema = z.object({
  chamberName: z.string().min(2).optional(),
  floor: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function clinicRoutes(fastify: FastifyInstance) {
  /**
   * Provision New Clinic Tenant: POST /api/v1/admin/clinics
   * Restricted to SUPER_ADMIN role
   */
  fastify.post(
    '/admin/clinics',
    {
      preHandler: [requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN] })],
    },
    async (req, reply) => {
      const parseResult = createClinicSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const result = await clinicService.createClinic(parseResult.data);
      return reply.status(201).send({
        success: true,
        message: `Clinic tenant '${result.clinic.name}' provisioned successfully with ${result.chambers.length} chambers.`,
        ...result,
      });
    }
  );

  /**
   * Get Clinic Profile & Chambers: GET /api/v1/admin/clinics/:clinicId
   */
  fastify.get(
    '/admin/clinics/:clinicId',
    {
      preHandler: [
        requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST] }),
        requireTenantMatch('params'),
      ],
    },
    async (req, reply) => {
      const { clinicId } = req.params as { clinicId: string };
      const result = await clinicService.getClinicById(clinicId);

      if (!result) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Clinic with ID '${clinicId}' does not exist`,
        });
      }

      return reply.status(200).send({
        success: true,
        ...result,
      });
    }
  );

  /**
   * Provision Physical Chamber: POST /api/v1/admin/clinics/:clinicId/chambers
   */
  fastify.post(
    '/admin/clinics/:clinicId/chambers',
    {
      preHandler: [
        requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] }),
        requireTenantMatch('params'),
      ],
    },
    async (req, reply) => {
      const { clinicId } = req.params as { clinicId: string };
      const parseResult = createChamberSchema.safeParse(req.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      try {
        const chamber = await clinicService.addChamber(clinicId, parseResult.data);
        return reply.status(201).send({
          success: true,
          message: `Chamber '${chamber.chamberNumber}' added successfully.`,
          chamber,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add chamber';
        const isConflict = message.includes('already exists');
        return reply.status(isConflict ? 409 : 400).send({
          error: isConflict ? 'Conflict' : 'Bad Request',
          message,
        });
      }
    }
  );

  /**
   * List Chambers: GET /api/v1/admin/clinics/:clinicId/chambers
   */
  fastify.get(
    '/admin/clinics/:clinicId/chambers',
    {
      preHandler: [
        requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST] }),
        requireTenantMatch('params'),
      ],
    },
    async (req, reply) => {
      const { clinicId } = req.params as { clinicId: string };
      try {
        const chambers = await clinicService.listChambers(clinicId);
        return reply.status(200).send({
          success: true,
          clinicId,
          chambersCount: chambers.length,
          chambers,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to list chambers';
        return reply.status(404).send({ error: 'Not Found', message });
      }
    }
  );

  /**
   * Update Chamber: PATCH /api/v1/admin/clinics/:clinicId/chambers/:chamberNumber
   */
  fastify.patch(
    '/admin/clinics/:clinicId/chambers/:chamberNumber',
    {
      preHandler: [
        requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] }),
        requireTenantMatch('params'),
      ],
    },
    async (req, reply) => {
      const { clinicId, chamberNumber } = req.params as { clinicId: string; chamberNumber: string };
      const parseResult = updateChamberSchema.safeParse(req.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      try {
        const updated = await clinicService.updateChamber(clinicId, chamberNumber, parseResult.data);
        return reply.status(200).send({
          success: true,
          message: `Chamber '${chamberNumber}' updated successfully.`,
          chamber: updated,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update chamber';
        return reply.status(404).send({ error: 'Not Found', message });
      }
    }
  );
}

