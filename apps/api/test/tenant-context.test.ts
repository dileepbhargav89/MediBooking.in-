/**
 * Phase 3 Multi-Tenant Context Middleware & RBAC Permission Guards Test Suite
 * Validates tenant isolation, cross-chamber doctor restrictions, dual-scope staff rules,
 * and Super Admin cross-tenant capabilities.
 */

import Fastify from 'fastify';
import {
  requireAuth,
  requireTenantMatch,
  requireChamberAccess,
} from '../src/middleware/tenant-context';
import { authService } from '../src/services/auth-service';
import { UserRole, StaffScope } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';

async function runTenantContextTests() {
  console.log('\n--- STARTING PHASE 3 MULTI-TENANT & RBAC GUARD TESTS ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(` [FAIL] ${message}`);
      failed++;
    }
  }

  const app = Fastify();

  // Test Route 1: Clinic tenant scoped endpoint
  app.get(
    '/test/clinics/:clinicId/protected',
    {
      preHandler: [
        requireAuth({ allowedRoles: [UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.SUPER_ADMIN] }),
        requireTenantMatch('params'),
      ],
    },
    async (req) => ({ success: true, clinicId: req.tenant?.activeClinicId })
  );

  // Test Route 2: Chamber scoped endpoint
  app.post(
    '/test/clinics/:clinicId/chambers/:chamberNumber/queue',
    {
      preHandler: [
        requireAuth({ allowedRoles: [UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.SUPER_ADMIN] }),
        requireTenantMatch('params'),
        requireChamberAccess('chamberNumber', 'params'),
      ],
    },
    async (req) => ({
      success: true,
      chamber: (req.params as { chamberNumber: string }).chamberNumber,
      userRole: req.tenant?.activeRole,
    })
  );

  await app.ready();

  const clinicId = SEED_DATA.clinic.id;
  const foreignClinicId = 'c9999999-9999-4999-8999-999999999999';

  // 1. Unauthenticated request without token/header is rejected or defaults to PATIENT
  const unauthRes = await app.inject({
    method: 'GET',
    url: `/test/clinics/${clinicId}/protected`,
  });
  assert(unauthRes.statusCode === 403, 'Patient / unauthenticated caller blocked from staff route with 403 Forbidden');

  // 2. Caller with valid Clinic Admin JWT accessing their own clinic
  const adminToken = authService.signToken({
    sub: 'admin-01',
    mobile: '9826099999',
    role: UserRole.CLINIC_ADMIN,
    clinicId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const adminRes = await app.inject({
    method: 'GET',
    url: `/test/clinics/${clinicId}/protected`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert(adminRes.statusCode === 200, 'Clinic Admin successfully accesses their own clinic');

  // 3. Horizontal privilege breach attempt: Clinic Admin A attempting to access Clinic B
  const crossTenantRes = await app.inject({
    method: 'GET',
    url: `/test/clinics/${foreignClinicId}/protected`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert(crossTenantRes.statusCode === 403, 'Cross-tenant breach blocked with 403 Forbidden');
  assert(
    JSON.parse(crossTenantRes.payload).message.includes('Tenant Isolation Violation'),
    'Descriptive tenant isolation violation error returned'
  );

  // 4. Platform SUPER_ADMIN cross-tenant access allowed
  const superAdminToken = authService.signToken({
    sub: 'super-01',
    mobile: '9826000000',
    role: UserRole.SUPER_ADMIN,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const superAdminRes = await app.inject({
    method: 'GET',
    url: `/test/clinics/${foreignClinicId}/protected`,
    headers: { authorization: `Bearer ${superAdminToken}` },
  });
  assert(superAdminRes.statusCode === 200, 'Super Admin granted cross-tenant access');

  // 5. Doctor Chamber Isolation: Doctor assigned to CH-1 operates on CH-1 (Success)
  const doctorToken = authService.signToken({
    sub: SEED_DATA.doctors[0]!.doctorId,
    mobile: '9826012345',
    role: UserRole.DOCTOR,
    clinicId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const docChamber1Res = await app.inject({
    method: 'POST',
    url: `/test/clinics/${clinicId}/chambers/CH-1/queue`,
    headers: { authorization: `Bearer ${doctorToken}` },
  });
  assert(docChamber1Res.statusCode === 200, 'Doctor successfully accesses their assigned chamber CH-1');

  // 6. Doctor Chamber Breach: Doctor assigned to CH-1 attempts to operate on CH-2 (Blocked)
  const docChamber2Res = await app.inject({
    method: 'POST',
    url: `/test/clinics/${clinicId}/chambers/CH-2/queue`,
    headers: { authorization: `Bearer ${doctorToken}` },
  });
  assert(docChamber2Res.statusCode === 403, 'Doctor blocked from operating on another doctor chamber (CH-2) with 403');
  assert(
    JSON.parse(docChamber2Res.payload).message.includes('Chamber Access Denied'),
    'Returns descriptive Chamber Access Denied message'
  );

  // 7. Dedicated Compounder bound to Doctor A (CH-1) attempts to operate on Doctor B (CH-2)
  const dedicatedStaffToken = authService.signToken({
    sub: SEED_DATA.staff[1]!.userId, // dedicated staff member
    mobile: '9826033333',
    role: UserRole.RECEPTIONIST,
    clinicId,
    staffScope: StaffScope.DOCTOR_DEDICATED,
    dedicatedDoctorId: SEED_DATA.doctors[0]!.doctorId, // Bound to Dr. Sharma (CH-1)
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const dedicatedChamber2Res = await app.inject({
    method: 'POST',
    url: `/test/clinics/${clinicId}/chambers/CH-2/queue`,
    headers: { authorization: `Bearer ${dedicatedStaffToken}` },
  });
  assert(dedicatedChamber2Res.statusCode === 403, 'Dedicated compounder blocked from accessing non-dedicated chamber CH-2');
  assert(
    JSON.parse(dedicatedChamber2Res.payload).message.includes('Staff Scope Restriction'),
    'Returns Staff Scope Restriction error'
  );

  // 8. Dedicated Compounder accessing assigned chamber CH-1 (Success)
  const dedicatedChamber1Res = await app.inject({
    method: 'POST',
    url: `/test/clinics/${clinicId}/chambers/CH-1/queue`,
    headers: { authorization: `Bearer ${dedicatedStaffToken}` },
  });
  assert(dedicatedChamber1Res.statusCode === 200, 'Dedicated compounder successfully accesses assigned doctor chamber CH-1');

  // 9. Central Receptionist (CLINIC_WIDE) accessing all chambers in clinic (Success on both CH-1 and CH-2)
  const centralReceptionistToken = authService.signToken({
    sub: SEED_DATA.staff[0]!.userId,
    mobile: '9826022222',
    role: UserRole.RECEPTIONIST,
    clinicId,
    staffScope: StaffScope.CLINIC_WIDE,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const recCh1Res = await app.inject({
    method: 'POST',
    url: `/test/clinics/${clinicId}/chambers/CH-1/queue`,
    headers: { authorization: `Bearer ${centralReceptionistToken}` },
  });
  const recCh2Res = await app.inject({
    method: 'POST',
    url: `/test/clinics/${clinicId}/chambers/CH-2/queue`,
    headers: { authorization: `Bearer ${centralReceptionistToken}` },
  });
  assert(recCh1Res.statusCode === 200 && recCh2Res.statusCode === 200, 'Central receptionist (CLINIC_WIDE) has full access across all chambers');

  // 10. Clinic Admin accessing all chambers in clinic (Success)
  const adminChamberRes = await app.inject({
    method: 'POST',
    url: `/test/clinics/${clinicId}/chambers/CH-3/queue`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert(adminChamberRes.statusCode === 200, 'Clinic Admin has administrative oversight of all chambers');

  await app.close();

  console.log(`\n--- PHASE 3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTenantContextTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
