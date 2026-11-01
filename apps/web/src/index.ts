/**
 * MediBooking Unified Web Application
 * Single UI Entrypoint with 5 Dynamic RBAC Portals
 */
export * from '@medibooking/types';

export const PORTAL_ROUTES = {
  SUPER_ADMIN: '/super-admin',
  CLINIC_ADMIN: '/admin',
  DOCTOR: '/doctor',
  RECEPTIONIST: '/receptionist',
  PATIENT: '/patient',
  PUBLIC_DOCTOR: (slug: string) => `/dr/${slug}`,
  PUBLIC_TV: (clinicSlug: string) => `/tv/${clinicSlug}`,
} as const;

