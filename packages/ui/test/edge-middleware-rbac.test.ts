import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  UserRole,
  isPublicPath,
  getRoleDefaultPortal,
  canAccessPath,
  parseSessionToken,
} from '@medibooking/types';

describe('Phase 35: Next.js Edge Middleware Dynamic Role Redirection Engine', () => {
  it('1. Public Path Whitelist: Allows public access to TV, Dr discovery, login and assets', () => {
    assert.strictEqual(isPublicPath('/'), true);
    assert.strictEqual(isPublicPath('/login'), true);
    assert.strictEqual(isPublicPath('/dr/dr-rajesh-sharma-cardio'), true);
    assert.strictEqual(isPublicPath('/tv/bhopal-city-care'), true);
    assert.strictEqual(isPublicPath('/_next/static/chunks/main.js'), true);
    assert.strictEqual(isPublicPath('/api/v1/health'), true);
    assert.strictEqual(isPublicPath('/favicon.ico'), true);

    // Protected paths must not be considered public
    assert.strictEqual(isPublicPath('/receptionist'), false);
    assert.strictEqual(isPublicPath('/doctor'), false);
    assert.strictEqual(isPublicPath('/admin'), false);
    assert.strictEqual(isPublicPath('/super-admin'), false);
    assert.strictEqual(isPublicPath('/patient'), false);
  });

  it('2. Session Token Extraction: Accurately decodes mock tokens and 3-part base64url JWTs', () => {
    // Dev Mock Token
    const mockSession = parseSessionToken('mock-token-9826033333-RECEPTIONIST');
    assert.ok(mockSession);
    assert.strictEqual(mockSession.role, UserRole.RECEPTIONIST);
    assert.strictEqual(mockSession.mobile, '9826033333');
    assert.strictEqual(mockSession.clinicId, 'c1010000-0000-4000-8000-000000000001');

    // Standard 3-part JWT
    const payload = {
      userId: 'u1010000-0000-4000-8000-000000000001',
      role: UserRole.DOCTOR,
      clinicId: 'c1010000-0000-4000-8000-000000000001',
      doctorId: 'd1010000-0000-4000-8000-000000000001',
      mobile: '9826022222',
    };
    const headerBase64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const mockJwt = `${headerBase64}.${payloadBase64}.mock-signature-hash`;

    const jwtSession = parseSessionToken(mockJwt);
    assert.ok(jwtSession);
    assert.strictEqual(jwtSession.userId, payload.userId);
    assert.strictEqual(jwtSession.role, UserRole.DOCTOR);
    assert.strictEqual(jwtSession.doctorId, payload.doctorId);

    // Null/Invalid tokens
    assert.strictEqual(parseSessionToken(null), null);
    assert.strictEqual(parseSessionToken('invalid.token'), null);
    assert.strictEqual(parseSessionToken(''), null);
  });

  it('3. Default Portal Routing: Resolves primary landing portal by user role', () => {
    assert.strictEqual(getRoleDefaultPortal(UserRole.SUPER_ADMIN), '/super-admin');
    assert.strictEqual(getRoleDefaultPortal(UserRole.CLINIC_ADMIN), '/admin');
    assert.strictEqual(getRoleDefaultPortal(UserRole.DOCTOR), '/doctor');
    assert.strictEqual(getRoleDefaultPortal(UserRole.RECEPTIONIST), '/receptionist');
    assert.strictEqual(getRoleDefaultPortal(UserRole.PATIENT), '/patient');
  });

  it('4. RBAC Route Guards: Enforces role isolation across portals', () => {
    // /super-admin: strictly SUPER_ADMIN
    assert.strictEqual(canAccessPath(UserRole.SUPER_ADMIN, '/super-admin/tenants'), true);
    assert.strictEqual(canAccessPath(UserRole.CLINIC_ADMIN, '/super-admin'), false);
    assert.strictEqual(canAccessPath(UserRole.DOCTOR, '/super-admin'), false);
    assert.strictEqual(canAccessPath(UserRole.RECEPTIONIST, '/super-admin'), false);

    // /admin: CLINIC_ADMIN and SUPER_ADMIN
    assert.strictEqual(canAccessPath(UserRole.SUPER_ADMIN, '/admin/settings'), true);
    assert.strictEqual(canAccessPath(UserRole.CLINIC_ADMIN, '/admin'), true);
    assert.strictEqual(canAccessPath(UserRole.DOCTOR, '/admin'), false);
    assert.strictEqual(canAccessPath(UserRole.RECEPTIONIST, '/admin'), false);

    // /doctor: DOCTOR and SUPER_ADMIN
    assert.strictEqual(canAccessPath(UserRole.DOCTOR, '/doctor/chamber'), true);
    assert.strictEqual(canAccessPath(UserRole.SUPER_ADMIN, '/doctor'), true);
    assert.strictEqual(canAccessPath(UserRole.RECEPTIONIST, '/doctor'), false);
    assert.strictEqual(canAccessPath(UserRole.PATIENT, '/doctor'), false);

    // /receptionist: RECEPTIONIST, CLINIC_ADMIN, and SUPER_ADMIN
    assert.strictEqual(canAccessPath(UserRole.RECEPTIONIST, '/receptionist'), true);
    assert.strictEqual(canAccessPath(UserRole.CLINIC_ADMIN, '/receptionist'), true);
    assert.strictEqual(canAccessPath(UserRole.SUPER_ADMIN, '/receptionist'), true);
    assert.strictEqual(canAccessPath(UserRole.DOCTOR, '/receptionist'), false);
    assert.strictEqual(canAccessPath(UserRole.PATIENT, '/receptionist'), false);

    // /patient: accessible by all authenticated roles
    assert.strictEqual(canAccessPath(UserRole.PATIENT, '/patient/tokens'), true);
    assert.strictEqual(canAccessPath(UserRole.DOCTOR, '/patient'), true);
  });
});
