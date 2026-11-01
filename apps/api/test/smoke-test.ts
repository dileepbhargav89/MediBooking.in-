/**
 * MediBooking Enterprise API Automated Smoke Test Suite
 * Verifies Fastify routing, concurrency engine mutex locks, and dual-scope receptionist queues
 */

import { createApiServer } from '../src/server';
import { SEED_DATA } from '@medibooking/database';

async function runTests() {
  console.log('--- STARTING SPRINT 2 API SMOKE TESTS ---\n');
  const app = createApiServer();
  await app.ready();

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(` [PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failCount++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await app.inject({ method: 'GET', url: '/health' });
    const health = JSON.parse(healthRes.body);
    assert(healthRes.statusCode === 200 && health.status === 'ONLINE', 'Health endpoint returns 200 ONLINE');

    // 2. Doctor-First public discovery
    const docRes = await app.inject({ method: 'GET', url: '/api/v1/doctors/dr-rajesh-sharma-cardio' });
    const docData = JSON.parse(docRes.body);
    assert(
      docRes.statusCode === 200 &&
        docData.doctor.fullName === 'Dr. Rajesh Sharma' &&
        docData.consultingVenues[0].chamberNumber === 'CH-1',
      'Doctor-First profile /dr/slug returns credentials & chamber venue'
    );

    // 3. Concurrency Lock: First acquisition succeeds
    const lock1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/public/slots/slot-test-01/lock',
      payload: { sessionId: 'session-patient-A', ttlSeconds: 300 },
    });
    assert(lock1Res.statusCode === 200, 'Slot lock acquired by Patient A');

    // 4. Concurrency Lock Conflict: Second acquisition fails with 409
    const lock2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/public/slots/slot-test-01/lock',
      payload: { sessionId: 'session-patient-B', ttlSeconds: 300 },
    });
    assert(lock2Res.statusCode === 409, 'Concurrent booking attempt on locked slot returns 409 Conflict');

    // 5. 15-second reception walk-in intake
    const intakeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reception/intake',
      headers: {
        'x-user-role': 'RECEPTIONIST',
        'x-clinic-id': SEED_DATA.clinic.id,
      },
      payload: {
        clinicId: SEED_DATA.clinic.id,
        doctorId: SEED_DATA.doctors[0]!.doctorId,
        chamberNumber: 'CH-1',
        patientName: 'Vikas Dubey',
        mobile: '9826199999',
        ageYears: 42,
        triageSeverity: 'ROUTINE',
        paymentMethod: 'PAID_CASH',
        amountRupees: 700,
      },
    });
    const intakeData = JSON.parse(intakeRes.body);
    assert(
      intakeRes.statusCode === 200 &&
        intakeData.success === true &&
        intakeData.tokenNumber > 0 &&
        intakeData.thermalSlipData.patientName === 'Vikas Dubey',
      '15-sec walk-in intake succeeds with token number & thermal slip data'
    );

    // 6. Reception multi-chamber queues
    const queueRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reception/queues',
      headers: {
        'x-user-role': 'RECEPTIONIST',
        'x-clinic-id': SEED_DATA.clinic.id,
      },
    });
    const queueData = JSON.parse(queueRes.body);
    assert(
      queueRes.statusCode === 200 && queueData.queues.length === 4,
      'Central receptionist receives multi-chamber queues for all 4 rooms'
    );

    // 7. 1-Click Doctor delay broadcast
    const delayRes = await app.inject({
      method: 'POST',
      url: '/api/v1/doctor/delay-broadcast',
      headers: {
        'x-user-role': 'DOCTOR',
        'x-clinic-id': SEED_DATA.clinic.id,
      },
      payload: {
        clinicId: SEED_DATA.clinic.id,
        doctorId: SEED_DATA.doctors[0]!.doctorId,
        delayMinutes: 30,
        reasonOption: 'HOSPITAL_EMERGENCY',
      },
    });
    assert(delayRes.statusCode === 200, 'Doctor 1-click delay broadcast executes successfully');

    // 8. Real-time TV snapshot reflects the delay
    const tvRes = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/clinics/${SEED_DATA.clinic.id}/snapshot`,
    });
    const tvData = JSON.parse(tvRes.body);
    const chamber1 = tvData.chambers.find((c: any) => c.chamberNumber === 'CH-1');
    assert(
      tvRes.statusCode === 200 && chamber1 && chamber1.delayMinutes === 30,
      'Waiting Room TV snapshot dynamically reflects updated chamber delay'
    );
  } finally {
    await app.close();
  }

  console.log(`\n--- TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED ---`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});

