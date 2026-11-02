/**
 * Phase 4 Clinic Tenant Provisioning & Multi-Chamber Engine Test Suite
 * Validates clinic tenant creation, slug collision avoidance, physical chamber setup,
 * duplicate chamber constraints, and RBAC admin controls.
 */

import { clinicService } from '../src/services/clinic-service';
import { createApiServer } from '../src/server';
import { authService } from '../src/services/auth-service';
import { UserRole } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';

async function runClinicTests() {
  console.log('\n--- STARTING PHASE 4 CLINIC & MULTI-CHAMBER ENGINE TESTS ---\n');
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

  clinicService.resetStore();

  // Test 1: Seed data includes initial Bhopal polyclinic and 4 chambers
  const seedClinic = await clinicService.getClinicById(SEED_DATA.clinic.id);
  assert(seedClinic !== null, 'Initial Bhopal clinic loaded from seed data');
  assert(seedClinic!.chambers.length === 4, 'Initial Bhopal clinic has 4 pre-configured chambers (CH-1..CH-4)');

  // Test 2: Provision a new clinic tenant
  const newClinicRes = await clinicService.createClinic({
    name: 'Bhopal Health Care Centre',
    addressLine: 'Plot 45, Arera Colony, Near Bittan Market',
    locality: 'Arera Colony',
    city: 'Bhopal',
    pincode: '462016',
    contactPhone: '9826088888',
    initialChambersCount: 3,
  });

  assert(newClinicRes.clinic.slug === 'bhopal-health-care-centre', 'Auto-generates clean kebab-case slug');
  assert(newClinicRes.chambers.length === 3, 'Provisions requested 3 initial physical chambers');
  assert(newClinicRes.chambers[0]!.chamberNumber === 'CH-1', 'Initial chamber starts at CH-1');

  // Test 3: Slug collision avoidance
  const collisionClinicRes = await clinicService.createClinic({
    name: 'Bhopal Health Care Centre',
    addressLine: 'Another branch in Kolar',
    locality: 'Kolar Road',
    pincode: '462042',
    contactPhone: '9826077777',
  });
  assert(collisionClinicRes.clinic.slug === 'bhopal-health-care-centre-1', 'Appends unique counter on slug collision');

  // Test 4: Add new chamber to clinic
  const addedChamber = await clinicService.addChamber(SEED_DATA.clinic.id, {
    chamberNumber: 'CH-5',
    chamberName: 'Pediatric Specialty Suite',
    floor: 'First Floor',
  });
  assert(addedChamber.chamberNumber === 'CH-5', 'Adds physical chamber CH-5 to clinic');
  assert(addedChamber.floor === 'First Floor', 'Saves floor assignment');

  // Test 5: Reject duplicate chamber number in same clinic
  let duplicateThrew = false;
  try {
    await clinicService.addChamber(SEED_DATA.clinic.id, {
      chamberNumber: 'CH-1', // Already exists!
      chamberName: 'Duplicate Chamber',
    });
  } catch (err: unknown) {
    duplicateThrew = (err as Error).message.includes('already exists');
  }
  assert(duplicateThrew, 'Rejects duplicate chamber number within the same clinic tenant');

  // Test 6: Update chamber details
  const updatedChamber = await clinicService.updateChamber(SEED_DATA.clinic.id, 'CH-5', {
    chamberName: 'Pediatric & Neonatal Suite',
    isActive: false, // Temporarily closed for renovation
  });
  assert(updatedChamber.chamberName === 'Pediatric & Neonatal Suite', 'Updates chamber name successfully');
  assert(updatedChamber.isActive === false, 'Toggles chamber active state to false');

  // Test 7: HTTP Integration Tests
  const app = createApiServer();
  await app.ready();

  const superAdminToken = authService.signToken({
    sub: 'usr-super-01',
    mobile: '9826000000',
    role: UserRole.SUPER_ADMIN,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const clinicAdminToken = authService.signToken({
    sub: 'usr-admin-01',
    mobile: '9826099999',
    role: UserRole.CLINIC_ADMIN,
    clinicId: SEED_DATA.clinic.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const doctorToken = authService.signToken({
    sub: 'usr-doc-01',
    mobile: '9826012345',
    role: UserRole.DOCTOR,
    clinicId: SEED_DATA.clinic.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  // Test 8: Super Admin creates clinic via HTTP
  const httpCreateClinic = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/clinics',
    headers: { authorization: `Bearer ${superAdminToken}` },
    payload: {
      name: 'Indore Medicare Centre',
      addressLine: 'Vijay Nagar Square',
      locality: 'Vijay Nagar',
      city: 'Indore',
      pincode: '452010',
      contactPhone: '9826011223',
    },
  });
  assert(httpCreateClinic.statusCode === 201, 'POST /api/v1/admin/clinics succeeds for SUPER_ADMIN (201)');

  // Test 9: Clinic Admin blocked from creating new clinic (Super Admin only)
  const httpForbiddenClinic = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/clinics',
    headers: { authorization: `Bearer ${clinicAdminToken}` },
    payload: {
      name: 'Unauthorized Clinic Attempt',
      addressLine: 'Somewhere',
      locality: 'Test',
      pincode: '462001',
      contactPhone: '9826099999',
    },
  });
  assert(httpForbiddenClinic.statusCode === 403, 'Clinic Admin blocked from creating global clinic tenants with 403');

  // Test 10: Clinic Admin adds chamber to their clinic via HTTP
  const httpAddChamber = await app.inject({
    method: 'POST',
    url: `/api/v1/admin/clinics/${SEED_DATA.clinic.id}/chambers`,
    headers: { authorization: `Bearer ${clinicAdminToken}` },
    payload: {
      chamberNumber: 'CH-6',
      chamberName: 'Orthopedic Fracture Clinic',
      floor: 'Second Floor',
    },
  });
  assert(httpAddChamber.statusCode === 201, 'POST /api/v1/admin/clinics/:id/chambers succeeds for CLINIC_ADMIN (201)');

  // Test 11: Duplicate chamber via HTTP returns 409 Conflict
  const httpConflictChamber = await app.inject({
    method: 'POST',
    url: `/api/v1/admin/clinics/${SEED_DATA.clinic.id}/chambers`,
    headers: { authorization: `Bearer ${clinicAdminToken}` },
    payload: {
      chamberNumber: 'CH-6', // Duplicate!
      chamberName: 'Duplicate Chamber',
    },
  });
  assert(httpConflictChamber.statusCode === 409, 'Duplicate chamber creation returns HTTP 409 Conflict');

  // Test 12: List chambers via HTTP
  const httpListChambers = await app.inject({
    method: 'GET',
    url: `/api/v1/admin/clinics/${SEED_DATA.clinic.id}/chambers`,
    headers: { authorization: `Bearer ${clinicAdminToken}` },
  });
  assert(httpListChambers.statusCode === 200, 'GET /api/v1/admin/clinics/:id/chambers returns 200 OK');
  const chamberList = JSON.parse(httpListChambers.payload).chambers;
  assert(chamberList.length >= 5, 'Chamber list includes pre-configured and newly added chambers');

  // Test 13: Doctor blocked from modifying chamber setup
  const httpDocBlocked = await app.inject({
    method: 'POST',
    url: `/api/v1/admin/clinics/${SEED_DATA.clinic.id}/chambers`,
    headers: { authorization: `Bearer ${doctorToken}` },
    payload: {
      chamberNumber: 'CH-99',
      chamberName: 'Doctor Rogue Chamber',
    },
  });
  assert(httpDocBlocked.statusCode === 403, 'Doctor blocked from adding chambers with 403 Forbidden');

  await app.close();

  console.log(`\n--- PHASE 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runClinicTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
