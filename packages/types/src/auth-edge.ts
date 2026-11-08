/**
 * MediBooking Edge Runtime Auth & RBAC Route Evaluator
 * High-performance, zero-crypto-dependency edge helper
 */

import { UserRole } from './index';

export interface DecodedSessionUser {
  userId: string;
  role: UserRole;
  clinicId?: string;
  doctorId?: string;
  mobile?: string;
}

/**
 * Checks if a given path is completely public and bypasses auth
 */
export function isPublicPath(pathname: string): boolean {
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/dr/') ||
    pathname.startsWith('/tv/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return true;
  }
  return false;
}

/**
 * Returns the default portal home route for a given user role
 */
export function getRoleDefaultPortal(role?: string | UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
    case 'SUPER_ADMIN':
      return '/super-admin';
    case UserRole.CLINIC_ADMIN:
    case 'CLINIC_ADMIN':
      return '/admin';
    case UserRole.DOCTOR:
    case 'DOCTOR':
      return '/doctor';
    case UserRole.RECEPTIONIST:
    case 'RECEPTIONIST':
      return '/receptionist';
    case UserRole.PATIENT:
    case 'PATIENT':
    default:
      return '/patient';
  }
}

/**
 * Determines if a user role is permitted to access a given portal path
 */
export function canAccessPath(role: string | UserRole, pathname: string): boolean {
  if (pathname.startsWith('/super-admin')) {
    return role === UserRole.SUPER_ADMIN || role === 'SUPER_ADMIN';
  }

  if (pathname.startsWith('/admin')) {
    return (
      role === UserRole.SUPER_ADMIN ||
      role === 'SUPER_ADMIN' ||
      role === UserRole.CLINIC_ADMIN ||
      role === 'CLINIC_ADMIN'
    );
  }

  if (pathname.startsWith('/doctor')) {
    return (
      role === UserRole.SUPER_ADMIN ||
      role === 'SUPER_ADMIN' ||
      role === UserRole.DOCTOR ||
      role === 'DOCTOR'
    );
  }

  if (pathname.startsWith('/receptionist')) {
    return (
      role === UserRole.SUPER_ADMIN ||
      role === 'SUPER_ADMIN' ||
      role === UserRole.CLINIC_ADMIN ||
      role === 'CLINIC_ADMIN' ||
      role === UserRole.RECEPTIONIST ||
      role === 'RECEPTIONIST'
    );
  }

  if (pathname.startsWith('/patient')) {
    return true; // Any authenticated user can view their patient dashboard
  }

  return true;
}

/**
 * Decodes session token in Edge runtime (JWT or Dev Mock token)
 */
export function parseSessionToken(token: string | null | undefined): DecodedSessionUser | null {
  if (!token) return null;

  // Handle Dev / Mock Tokens (e.g. mock-token-9826033333-RECEPTIONIST)
  if (token.startsWith('mock-token-') || token === 'mock-offline-token') {
    const parts = token.split('-');
    const rolePart = parts[3] as UserRole;
    const role = Object.values(UserRole).includes(rolePart)
      ? rolePart
      : UserRole.RECEPTIONIST;

    return {
      userId: `usr-mock-${parts[2] || 'staff'}`,
      role,
      clinicId: 'c1010000-0000-4000-8000-000000000001',
      mobile: parts[2] || '9826033333',
    };
  }

  // Handle standard 3-part JWT
  const segments = token.split('.');
  if (segments.length !== 3) return null;

  try {
    const payloadBase64 = segments[1]!;
    // Edge base64url normalization with proper padding
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const jsonStr = atob(padded);

    const payload = JSON.parse(jsonStr);
    const userId = payload.userId || payload.sub;

    if (!userId || !payload.role) {
      return null;
    }

    return {
      userId,
      role: payload.role as UserRole,
      clinicId: payload.clinicId,
      doctorId: payload.doctorId,
      mobile: payload.mobile,
    };
  } catch {
    return null;
  }
}
