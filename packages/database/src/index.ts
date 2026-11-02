/**
 * MediBooking.in - Multi-Tenant Database Client & RLS Session Helpers
 */
export * from '@medibooking/types';
export * from './seed-data';
export * from './client';

export interface DatabaseConfig {
  connectionString: string;
  maxConnections: number;
  ssl: boolean;
}

export interface TenantContext {
  clinicId: string;
  userId: string;
  role: string;
}

/**
 * Creates an RLS context setting string for PostgreSQL multi-tenant isolation
 * e.g. SET LOCAL app.current_clinic_id = '...'
 */
export function buildRLSSessionQuery(context: TenantContext): string {
  return `
    SET LOCAL app.current_clinic_id = '${context.clinicId}';
    SET LOCAL app.current_user_id = '${context.userId}';
    SET LOCAL app.current_user_role = '${context.role}';
  `;
}
