/**
 * Phase 5 Doctor Master Profile & NMC Verification Test Suite
 * Validates doctor master profile creation, state medical council registration,
 * Super Admin verification desk, self-service profile updates, and public badge verification.
 */

import { doctorService } from '../src/services/doctor-service';
import { createApiServer } from '../src/server';
import { authService } from '../src/services/auth-service';
import { UserRole, MedicalSpecialty } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';

async function runDoctorTests() {
  console.log('\n--- STARTING PHASE 5 DOCTOR MASTER & NMC REGISTRY TESTS ---\n');
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

  doctorService.resetStore();

  // Test 1: Seed doctors are pre-verified
  const seedDoc = await doctorService.getDoctorBySlug('dr-rajesh-sharma-cardio');
  assert(seedDoc !== null, 'Dr. Rajesh Sharma loaded from seed data');
  assert(seedDoc!.isVerified === true, 'Seed doctor is marked as NMC verified');

  // Test 2: Provision a new doctor profile
  const newDoc = await doctorService.createDoctor({
    fullName: 'Dr. Alok Verma',
    registrationNumber: 'MP-29481-2015',
    stateMedicalCouncil: 'Madhya Pradesh Medical Council',
    specialties: [MedicalSpecialty.ORTHOPEDICS],
    qualifications: ['MBBS', 'MS (Ortho)', 'DNB (Ortho)'],
    experienceYears: 10,
    bio: 'Orthopedic and Joint Replacement Specialist in Bhopal',
  });

  assert(newDoc.slug.startsWith('dr-alok-verma'), 'Auto-generates clean slug with doctor prefix');
  assert(newDoc.isVerified === false, 'Newly registered doctor starts with isVerified = false (pending desk review)');
  assert(newDoc.registrationNumber === 'MP-29481-2015', 'Records NMC registration number');

  // Test 3: Super Admin verifies NMC credentials
  const verifiedResult = await doctorService.verifyNmcCredentials(
    newDoc.id,
    true,
    'Verified against MP Medical Council registry register vol 2015/B'
  );
  assert(verifiedResult.doctor.isVerified === true, 'Super Admin verifies NMC credentials');

  // Test 4: Doctor self-service profile update (bio & qualifications)
  const updatedDoc = await doctorService.updateDoctorProfile(newDoc.id, {
    bio: 'Senior Joint Replacement Surgeon at Bansal Hospital & CityCare',
    qualifications: ['MBBS', 'MS (Ortho)', 'Fellowship in Arthroscopy (Germany)'],
  });
  assert(updatedDoc.bio.includes('Senior Joint Replacement'), 'Doctor updates own bio');
  assert(updatedDoc.isVerified === true, 'Profile updates to bio preserve active verification status');

  // Test 5: Legal credential modification triggers automatic re-verification
  const credentialModifiedDoc = await doctorService.updateDoctorProfile(newDoc.id, {
    registrationNumber: 'MP-99999-2020', // Changed registration number
  });
  assert(credentialModifiedDoc.registrationNumber === 'MP-99999-2020', 'Updated registration number');
  assert(
    credentialModifiedDoc.isVerified === false,
    'Modifying NMC registration number automatically revokes verification (regulatory re-verification rule)'
  );

  // Test 6: HTTP Integration
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
    sub: newDoc.id,
    mobile: '9826012345',
    role: UserRole.DOCTOR,
    clinicId: SEED_DATA.clinic.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  // Test 7: Public Doctor Profile HTTP check
  const httpGetDoctor = await app.inject({
    method: 'GET',
    url: '/api/v1/doctors/dr-rajesh-sharma-cardio',
  });
  assert(httpGetDoctor.statusCode === 200, 'GET /api/v1/doctors/:slug returns 200 OK');
  const docPayload = JSON.parse(httpGetDoctor.payload);
  assert(docPayload.doctor.fullName === 'Dr. Rajesh Sharma', 'Returns doctor credentials');
  assert(docPayload.consultingVenues.length > 0, 'Returns affiliated venues');

  // Test 8: Public Verification Badge status check
  const httpVerifyStatus = await app.inject({
    method: 'GET',
    url: '/api/v1/public/doctors/dr-rajesh-sharma-cardio/verify-status',
  });
  assert(httpVerifyStatus.statusCode === 200, 'GET /api/v1/public/doctors/:slug/verify-status returns 200 OK');
  const badgePayload = JSON.parse(httpVerifyStatus.payload);
  assert(badgePayload.verificationBadge === 'NMC_VERIFIED_PRACTITIONER', 'Returns verified practitioner badge');

  // Test 9: Provisioning new doctor via HTTP
  const httpCreateDoc = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/doctors',
    headers: { authorization: `Bearer ${clinicAdminToken}` },
    payload: {
      fullName: 'Dr. Meera Joshi',
      registrationNumber: 'MP-33441-2018',
      stateMedicalCouncil: 'Madhya Pradesh Medical Council',
      specialties: [MedicalSpecialty.DERMATOLOGY],
      qualifications: ['MBBS', 'MD (Dermatology)'],
      experienceYears: 6,
    },
  });
  assert(httpCreateDoc.statusCode === 201, 'POST /api/v1/admin/doctors succeeds for CLINIC_ADMIN (201)');
  const createdDocId = JSON.parse(httpCreateDoc.payload).doctor.id;

  // Test 10: Super Admin verifies doctor via HTTP
  const httpVerifyNmc = await app.inject({
    method: 'PATCH',
    url: `/api/v1/admin/doctors/${createdDocId}/verify-nmc`,
    headers: { authorization: `Bearer ${superAdminToken}` },
    payload: { isVerified: true, auditNotes: 'Verified with state council' },
  });
  assert(httpVerifyNmc.statusCode === 200, 'Super Admin verifies NMC credentials via HTTP (200)');
  assert(JSON.parse(httpVerifyNmc.payload).doctor.isVerified === true, 'isVerified updated to true');

  // Test 11: Clinic Admin blocked from verifying NMC (Super Admin only)
  const httpBlockedVerify = await app.inject({
    method: 'PATCH',
    url: `/api/v1/admin/doctors/${createdDocId}/verify-nmc`,
    headers: { authorization: `Bearer ${clinicAdminToken}` },
    payload: { isVerified: true },
  });
  assert(httpBlockedVerify.statusCode === 403, 'Clinic Admin blocked from verifying NMC with 403 Forbidden');

  // Test 12: Doctor self-service profile update via HTTP
  const httpUpdateProfile = await app.inject({
    method: 'PATCH',
    url: '/api/v1/doctor/profile',
    headers: { authorization: `Bearer ${doctorToken}` },
    payload: { bio: 'Updated consultant bio via self-service portal' },
  });
  assert(httpUpdateProfile.statusCode === 200, 'Doctor updates profile via PATCH /api/v1/doctor/profile');

  await app.close();

  console.log(`\n--- PHASE 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDoctorTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});

