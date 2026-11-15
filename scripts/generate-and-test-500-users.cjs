/**
 * High-Volume 500 Demo User Generator & End-to-End Stress/RBAC Test Engine
 * Generates 100 Super Admins, 100 Clinic Admins, 100 Receptionists, 100 Doctors, 100 Patients
 * Validates authentication, JWT signing, multi-tenant RBAC boundaries, and latency.
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://127.0.0.1:4000';

const SPECIALTIES = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
  'Gastroenterology', 'Dermatology', 'General Medicine', 'Gynecology', 'ENT', 'Ophthalmology'
];

const BHOPAL_LOCALITIES = [
  'MP Nagar Zone-I', 'MP Nagar Zone-II', 'Arera Colony (E-1 to E-5)', 'Kolar Road (Sarvadharam)',
  'TT Nagar / Platinum Plaza', 'Indrapuri / BHEL', 'Malviya Nagar', 'Hoshangabad Road',
  'Shahpura', 'Ayodhya Bypass'
];

// Helper to make HTTP requests
async function apiPost(endpoint, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function apiGet(endpoint, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, { headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

// Generate 100 users per persona
function generateUserCohort() {
  const cohorts = {
    superAdmins: [],
    clinicAdmins: [],
    receptionists: [],
    doctors: [],
    patients: []
  };

  // 1. 100 Super Admins (9826000001 - 9826000100)
  for (let i = 1; i <= 100; i++) {
    const pad = String(i).padStart(4, '0');
    cohorts.superAdmins.push({
      id: `usr-superadmin-${pad}`,
      mobile: `982600${pad}`,
      role: 'SUPER_ADMIN',
      fullName: `Super Admin Console #${i}`,
      email: `superadmin.${i}@medibooking.in`
    });
  }

  // 2. 100 Clinic Admins (9826010001 - 9826010100)
  for (let i = 1; i <= 100; i++) {
    const pad = String(i).padStart(4, '0');
    const locality = BHOPAL_LOCALITIES[(i - 1) % BHOPAL_LOCALITIES.length];
    cohorts.clinicAdmins.push({
      id: `usr-admin-${pad}`,
      mobile: `982601${pad}`,
      role: 'CLINIC_ADMIN',
      fullName: `Admin ${locality} Center #${i}`,
      clinicId: 'c1010000-0000-4000-8000-000000000001',
      locality
    });
  }

  // 3. 100 Receptionists (9826030001 - 9826030100)
  for (let i = 1; i <= 100; i++) {
    const pad = String(i).padStart(4, '0');
    const shift = i % 2 === 0 ? 'EVENING' : 'MORNING';
    cohorts.receptionists.push({
      id: `usr-rec-${pad}`,
      mobile: `982603${pad}`,
      role: 'RECEPTIONIST',
      fullName: `Staff Desk Officer #${i}`,
      shift,
      clinicId: 'c1010000-0000-4000-8000-000000000001'
    });
  }

  // 4. 100 Doctors (9826020001 - 9826020100)
  for (let i = 1; i <= 100; i++) {
    const pad = String(i).padStart(4, '0');
    const specialty = SPECIALTIES[(i - 1) % SPECIALTIES.length];
    cohorts.doctors.push({
      id: `usr-doc-${pad}`,
      mobile: `982602${pad}`,
      role: 'DOCTOR',
      fullName: `Dr. Specialist ${specialty} #${i}`,
      specialty,
      nmcNumber: `MPMC-${20000 + i}`,
      chamberNumber: `CH-${((i - 1) % 4) + 1}`,
      feeRupees: 500 + (i % 5) * 50
    });
  }

  // 5. 100 Patients (9826040001 - 9826040100)
  for (let i = 1; i <= 100; i++) {
    const pad = String(i).padStart(4, '0');
    const age = i <= 10 ? Math.floor(i / 2) : 18 + (i % 70); // mix of pediatric, adults, geriatrics
    const isGeriatric = age >= 70;
    const isPediatric = age <= 12;
    cohorts.patients.push({
      id: `usr-pat-${pad}`,
      mobile: `982604${pad}`,
      role: 'PATIENT',
      fullName: `Patient Citizen #${i}`,
      age,
      gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
      bloodGroup: ['A+', 'B+', 'O+', 'AB+'][i % 4],
      isGeriatric,
      isPediatric,
      abhaId: `91-4820-9182-${String(1000 + i).slice(-4)}`
    });
  }

  return cohorts;
}

async function runHighVolumeUserTest() {
  console.log('================================================================');
  console.log(' MediBooking Enterprise High-Volume 500 Demo User Test Runner');
  console.log('================================================================\n');

  const cohorts = generateUserCohort();
  const summary = {
    totalUsers: 500,
    rolesTested: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT'],
    authSuccessCount: 0,
    authFailCount: 0,
    rbacSuccessCount: 0,
    rbacFailCount: 0,
    negativeSecurityChecksPassed: 0,
    latencies: [],
    errors: []
  };

  const startTime = Date.now();

  // Test 1: Batch Authenticate Sample Across All Roles
  // For maximum speed and high coverage, we authenticate all 500 users in parallel chunks of 25
  const allUsers = [
    ...cohorts.superAdmins,
    ...cohorts.clinicAdmins,
    ...cohorts.receptionists,
    ...cohorts.doctors,
    ...cohorts.patients
  ];

  console.log(`Starting Batch Authentication of ${allUsers.length} Users across 5 Roles...`);

  const chunkSize = 25;
  const userTokens = new Map();

  for (let c = 0; c < allUsers.length; c += chunkSize) {
    const chunk = allUsers.slice(c, c + chunkSize);
    await Promise.all(chunk.map(async (user) => {
      const t0 = Date.now();
      try {
        // Request OTP
        const otpRes = await apiPost('/api/v1/auth/request-otp', { mobile: user.mobile });
        if (!otpRes.ok) {
          summary.authFailCount++;
          summary.errors.push(`OTP Request failed for ${user.role} (${user.mobile}): ${JSON.stringify(otpRes.data)}`);
          return;
        }

        // Verify OTP with Dev Bypass '123456'
        const verifyRes = await apiPost('/api/v1/auth/verify-otp', {
          mobile: user.mobile,
          otp: '123456',
          preferredRole: user.role
        });

        if (!verifyRes.ok || !verifyRes.data?.token) {
          summary.authFailCount++;
          summary.errors.push(`OTP Verify failed for ${user.role} (${user.mobile}): ${JSON.stringify(verifyRes.data)}`);
          return;
        }

        const elapsed = Date.now() - t0;
        summary.latencies.push(elapsed);
        summary.authSuccessCount++;
        userTokens.set(user.id, { token: verifyRes.data.token, user });

      } catch (err) {
        summary.authFailCount++;
        summary.errors.push(`Exception authenticating ${user.mobile}: ${err.message}`);
      }
    }));
  }

  console.log(`✓ Authentication Completed: ${summary.authSuccessCount}/${allUsers.length} successful (${summary.authFailCount} failures).`);

  // Test 2: Role-Specific RBAC and Endpoint Validation
  console.log('\nStarting RBAC & Multi-Tenant Endpoint Boundary Checks...');

  // Super Admin validation (Sample 10)
  for (let i = 0; i < 10; i++) {
    const u = cohorts.superAdmins[i];
    const session = userTokens.get(u.id);
    if (!session) continue;

    const res = await apiGet('/api/v1/saas/network-metrics', session.token);
    if (res.ok && res.data?.metrics?.totalClinicsLive >= 10) {
      summary.rbacSuccessCount++;
    } else {
      summary.rbacFailCount++;
      summary.errors.push(`SuperAdmin RBAC failed for ${u.id}: status=${res.status}`);
    }
  }

  // Clinic Admin validation (Sample 10)
  for (let i = 0; i < 10; i++) {
    const u = cohorts.clinicAdmins[i];
    const session = userTokens.get(u.id);
    if (!session) continue;

    const res = await apiGet(`/api/v1/clinic/affiliations?clinicId=${u.clinicId}`, session.token);
    if (res.ok) {
      summary.rbacSuccessCount++;
    } else {
      summary.rbacFailCount++;
      summary.errors.push(`ClinicAdmin RBAC failed for ${u.id}: status=${res.status}`);
    }
  }

  // Receptionist validation (Sample 10)
  for (let i = 0; i < 10; i++) {
    const u = cohorts.receptionists[i];
    const session = userTokens.get(u.id);
    if (!session) continue;

    const res = await apiGet('/api/v1/reception/queues', session.token);
    if (res.ok) {
      summary.rbacSuccessCount++;
    } else {
      summary.rbacFailCount++;
      summary.errors.push(`Receptionist RBAC failed for ${u.id}: status=${res.status}`);
    }
  }

  // Doctor validation (Sample 10)
  for (let i = 0; i < 10; i++) {
    const u = cohorts.doctors[i];
    const session = userTokens.get(u.id);
    if (!session) continue;

    const res = await apiGet('/api/v1/emr/drugs/search?q=telma', session.token);
    if (res.ok && Array.isArray(res.data?.drugs)) {
      summary.rbacSuccessCount++;
    } else {
      summary.rbacFailCount++;
      summary.errors.push(`Doctor RBAC failed for ${u.id}: status=${res.status}`);
    }
  }

  // Patient validation (Sample 10)
  for (let i = 0; i < 10; i++) {
    const u = cohorts.patients[i];
    const session = userTokens.get(u.id);
    if (!session) continue;

    const res = await apiGet('/api/v1/patient/family?mobile=' + u.mobile, session.token);
    if (res.ok) {
      summary.rbacSuccessCount++;
    } else {
      summary.rbacFailCount++;
      summary.errors.push(`Patient RBAC failed for ${u.id}: status=${res.status}`);
    }
  }

  // Test 3: Negative Security Boundaries (Patient must NOT access Super Admin or Cashiering)
  console.log('\nValidating Negative Security Boundaries...');
  for (let i = 0; i < 5; i++) {
    const patientSession = userTokens.get(cohorts.patients[i].id);
    if (!patientSession) continue;

    const forbiddenRes = await apiGet('/api/v1/saas-bi/network-overview', patientSession.token);
    // Since our tenant context middleware requires SUPER_ADMIN for saas-bi
    // If it returns 403 or 401 or role rejection, boundary holds
    if (forbiddenRes.status === 403 || forbiddenRes.status === 401 || !forbiddenRes.ok) {
      summary.negativeSecurityChecksPassed++;
    } else {
      summary.errors.push(`Security Leak: Patient ${cohorts.patients[i].id} was able to access Super Admin BI!`);
    }
  }

  const totalDuration = (Date.now() - startTime) / 1000;
  const avgLatency = summary.latencies.length
    ? Math.round(summary.latencies.reduce((a, b) => a + b, 0) / summary.latencies.length)
    : 0;

  console.log('\n================================================================');
  console.log(' High-Volume User Test Execution Summary');
  console.log('================================================================');
  console.log(`Total Users Generated:          500 (100 per role)`);
  console.log(`Authentication Passes:          ${summary.authSuccessCount} / 500`);
  console.log(`Authentication Failures:        ${summary.authFailCount}`);
  console.log(`RBAC Endpoint Passes:           ${summary.rbacSuccessCount} / 50 sampled`);
  console.log(`Negative Boundary Passes:       ${summary.negativeSecurityChecksPassed} / 5 sampled`);
  console.log(`Average Auth Latency:           ${avgLatency} ms`);
  console.log(`Total Elapsed Time:             ${totalDuration.toFixed(2)} s`);
  console.log(`Errors Logged:                  ${summary.errors.length}`);
  if (summary.errors.length > 0) {
    console.log('First 5 Errors:', summary.errors.slice(0, 5));
  }
  console.log('================================================================\n');

  // Export results JSON to tests/reports
  const reportPath = path.join(__dirname, '..', 'tests', 'reports', '500-users-load-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary,
    totalDurationSeconds: totalDuration,
    avgLatencyMs: avgLatency
  }, null, 2));

  console.log(`Detailed report written to: ${reportPath}`);
}

runHighVolumeUserTest().catch(console.error);
