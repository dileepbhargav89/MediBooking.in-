/**
 * MediBooking Multi-Tenant & RBAC Middleware
 * Enforces PostgreSQL RLS session variables, multi-tenant boundaries,
 * and dual-scope receptionist chamber authorization.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, StaffScope, UserContext } from '@medibooking/types';
import { SEED_DATA, tenantDb, PoolClient } from '@medibooking/database';
import { authService } from '../services/auth-service';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: UserContext;
    tenantDb?: <T>(callback: (client: PoolClient | null) => Promise<T>) => Promise<T>;
  }
}

export interface TenantAuthOptions {
  allowedRoles?: UserRole[];
  requireClinic?: boolean;
}

/**
 * Resolves request identity from Bearer JWT or mock headers and enforces role + tenant boundaries
 */
export function requireAuth(options: TenantAuthOptions = {}) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    let resolvedRole: UserRole = UserRole.PATIENT;
    let resolvedClinicId: string = SEED_DATA.clinic.id;
    let resolvedUserId: string = 'u-demo-user-1';
    let resolvedMobile: string = '9826011111';
    let resolvedFullName: string = 'Demo User';
    let resolvedChamberNumber: string | undefined;
    let staffScope: StaffScope | undefined;
    let dedicatedDoctorId: string | undefined;

    // 1. Check for cryptographically signed Bearer JWT token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);
      if (!payload) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Session token has expired or signature is invalid',
        });
      }
      resolvedUserId = payload.sub;
      resolvedMobile = payload.mobile;
      resolvedRole = payload.role;
      resolvedClinicId = payload.clinicId || SEED_DATA.clinic.id;
      staffScope = payload.staffScope;
      dedicatedDoctorId = payload.dedicatedDoctorId;

      // Resolve chamber if doctor
      if (resolvedRole === UserRole.DOCTOR) {
        const doc = SEED_DATA.doctors.find((d) => d.slug.includes(resolvedMobile) || d.doctorId === resolvedUserId);
        resolvedChamberNumber = doc ? doc.chamberNumber : 'CH-1';
      }
    } else {
      // 2. Fallback to mock headers in test/demo mode
      resolvedRole = (req.headers['x-user-role'] as UserRole) || UserRole.PATIENT;
      resolvedClinicId = (req.headers['x-clinic-id'] as string) || SEED_DATA.clinic.id;
      resolvedUserId = (req.headers['x-user-id'] as string) || 'u-demo-user-1';

      if (resolvedRole === UserRole.RECEPTIONIST) {
        const staffMember = SEED_DATA.staff.find((s) => s.userId === resolvedUserId) || SEED_DATA.staff[0]!;
        staffScope = staffMember.scope;
        dedicatedDoctorId = staffMember.dedicatedDoctorId;
      } else if (resolvedRole === UserRole.DOCTOR) {
        const doc = SEED_DATA.doctors.find((d) => d.doctorId === resolvedUserId) || SEED_DATA.doctors[0]!;
        resolvedChamberNumber = doc.chamberNumber;
      }
    }

    // 3. Validate role against allowed roles if specified
    if (options.allowedRoles && !options.allowedRoles.includes(resolvedRole)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Role ${resolvedRole} is not authorized for this resource. Required: ${options.allowedRoles.join(', ')}`,
      });
    }

    // 4. Attach resolved tenant context to request
    req.tenant = {
      userId: resolvedUserId,
      mobile: resolvedMobile,
      fullName: resolvedFullName,
      activeRole: resolvedRole,
      activeClinicId: resolvedClinicId,
      activeClinicName: SEED_DATA.clinic.name,
      activeChamberNumber: resolvedChamberNumber,
      staffScope,
      dedicatedDoctorId,
      allowedRoles: [resolvedRole],
      availableClinics: [
        {
          clinicId: SEED_DATA.clinic.id,
          clinicName: SEED_DATA.clinic.name,
          role: resolvedRole,
          chamberNumber: resolvedChamberNumber,
        },
      ],
    };

    // 5. Scoped database RLS transaction executor attached to request
    req.tenantDb = async <T>(callback: (client: PoolClient | null) => Promise<T>): Promise<T> => {
      return await tenantDb.withTenantTransaction(
        {
          clinicId: req.tenant!.activeClinicId || SEED_DATA.clinic.id,
          userId: req.tenant!.userId,
          role: req.tenant!.activeRole,
        },
        callback
      );
    };

    // 6. If clinic is required and missing
    if (options.requireClinic && !req.tenant.activeClinicId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Active clinic context is required for this operational request',
      });
    }
  };
}

/**
 * Guard ensuring that clinicId specified in params, body, or query matches the caller's active clinic context.
 * SUPER_ADMIN is exempt to allow platform-wide administrative actions.
 */
export function requireTenantMatch(source: 'params' | 'body' | 'query' = 'params') {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.tenant) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (req.tenant.activeRole === UserRole.SUPER_ADMIN) {
      return; // Platform super admin has cross-tenant access
    }

    const payloadObj = (req[source] as Record<string, unknown>) || {};
    const targetClinicId =
      (payloadObj.clinicId as string | undefined) ||
      ((req.params as Record<string, unknown>)?.clinicId as string | undefined);

    if (targetClinicId && targetClinicId !== req.tenant.activeClinicId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Tenant Isolation Violation: Caller with clinic context '${req.tenant.activeClinicId}' cannot access resources belonging to clinic '${targetClinicId}'`,
      });
    }
  };
}

/**
 * Guard ensuring that the caller has authorization to manage or view the specific chamber (CH-1..CH-4).
 * - SUPER_ADMIN & CLINIC_ADMIN: Access all chambers in the clinic.
 * - DOCTOR: Can only access their assigned chamber.
 * - RECEPTIONIST (CLINIC_WIDE): Can access all chambers in the clinic.
 * - RECEPTIONIST (DOCTOR_DEDICATED): Can only access the chamber assigned to their dedicated doctor.
 */
export function requireChamberAccess(
  chamberKey: string = 'chamberNumber',
  source: 'params' | 'body' | 'query' = 'params'
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.tenant) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (req.tenant.activeRole === UserRole.SUPER_ADMIN || req.tenant.activeRole === UserRole.CLINIC_ADMIN) {
      return; // Admins have full clinic chamber access
    }

    const payloadObj = (req[source] as Record<string, unknown>) || {};
    const targetChamber =
      (payloadObj[chamberKey] as string | undefined) ||
      ((req.params as Record<string, unknown>)?.[chamberKey] as string | undefined) ||
      ((req.body as Record<string, unknown>)?.[chamberKey] as string | undefined);

    if (!targetChamber) {
      return; // No chamber constraint present on this endpoint
    }

    if (req.tenant.activeRole === UserRole.DOCTOR) {
      if (req.tenant.activeChamberNumber && req.tenant.activeChamberNumber !== targetChamber) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Chamber Access Denied: Doctor assigned to chamber '${req.tenant.activeChamberNumber}' cannot operate on '${targetChamber}'`,
        });
      }
    }

    if (req.tenant.activeRole === UserRole.RECEPTIONIST) {
      if (req.tenant.staffScope === StaffScope.DOCTOR_DEDICATED) {
        const dedicatedDoc = SEED_DATA.doctors.find((d) => d.doctorId === req.tenant?.dedicatedDoctorId);
        const allowedChamber = dedicatedDoc?.chamberNumber;
        if (allowedChamber && allowedChamber !== targetChamber) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: `Staff Scope Restriction: Dedicated compounder is bound to chamber '${allowedChamber}' (Doctor: ${dedicatedDoc?.fullName}) and cannot access '${targetChamber}'`,
          });
        }
      }
    }
  };
}
