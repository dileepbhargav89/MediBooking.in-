/**
 * Phase 25: Front-Desk Offline Queue Buffer & Batch Sync Test Suite
 * Validates chronological sorting, idempotency replay, cashiering integration, triage, and RBAC guards.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { offlineSyncService, SyncActor } from '../src/services/offline-sync-service';
import { appointmentService } from '../src/services/appointment-service';
import { cashieringService } from '../src/services/cashiering-service';
import { createApiServer } from '../src/server';
import { authService } from '../src/services/auth-service';
import { SEED_DATA } from '@medibooking/database';
import {
  PaymentMode,
  TriageSeverity,
  UserRole,
  StaffScope,
  BatchSyncIntakeDTO,
  OfflineIntakeItem,
} from '@medibooking/types';

describe('Phase 25: Front-Desk Offline Queue Buffer & Batch Sync API', () => {
  const clinicId = SEED_DATA.clinic.id;
  const doctorId = SEED_DATA.doctors[0]!.doctorId;
  const chamberNumber = SEED_DATA.doctors[0]!.chamberNumber;

  const defaultActor: SyncActor = {
    userId: 'staff-rec-01',
    role: UserRole.RECEPTIONIST,
    activeClinicId: clinicId,
    name: 'Main Reception Desk',
    staffScope: StaffScope.CLINIC_WIDE,
  };

  beforeEach(() => {
    appointmentService.reset();
    cashieringService.reset();
  });

  test('1. Chronological Sorting allocates sequential chamber tokens in arrival order', async () => {
    // 3 offline intakes submitted out of order
    const intakeEarly: OfflineIntakeItem = {
      clientOfflineId: 'OFF-01',
      idempotencyKey: 'a1000000-0000-4000-8000-000000000001',
      offlineRecordedAt: '2026-11-04T18:05:00.000Z',
      patientName: 'Aarav Patel',
      patientPhone: '9826011111',
      patientAge: 32,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.PAID_CASH,
      amount: 500,
    };

    const intakeMiddle: OfflineIntakeItem = {
      clientOfflineId: 'OFF-02',
      idempotencyKey: 'a2000000-0000-4000-8000-000000000002',
      offlineRecordedAt: '2026-11-04T18:15:00.000Z',
      patientName: 'Sunita Sharma',
      patientPhone: '9826022222',
      patientAge: 45,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.PAID_UPI_QR,
      amount: 500,
    };

    const intakeLate: OfflineIntakeItem = {
      clientOfflineId: 'OFF-03',
      idempotencyKey: 'a3000000-0000-4000-8000-000000000003',
      offlineRecordedAt: '2026-11-04T18:25:00.000Z',
      patientName: 'Karan Mehra',
      patientPhone: '9826033333',
      patientAge: 28,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.WAIVED_BY_DOCTOR,
      amount: 0,
    };

    // Submit out of order: Late, Early, Middle
    const dto: BatchSyncIntakeDTO = {
      clinicId,
      batchId: 'batch-reorder-001',
      syncedAt: '2026-11-04T18:35:00.000Z',
      intakes: [intakeLate, intakeEarly, intakeMiddle],
    };

    const response = await offlineSyncService.syncBatch(dto, defaultActor);

    assert.equal(response.totalSubmitted, 3);
    assert.equal(response.synchronizedCount, 3);
    assert.equal(response.duplicateCount, 0);
    assert.equal(response.failedCount, 0);

    // Verify token ordering matches chronological timestamps
    const resEarly = response.results.find((r) => r.clientOfflineId === 'OFF-01')!;
    const resMiddle = response.results.find((r) => r.clientOfflineId === 'OFF-02')!;
    const resLate = response.results.find((r) => r.clientOfflineId === 'OFF-03')!;

    assert.ok(resEarly.assignedTokenNumber! < resMiddle.assignedTokenNumber!);
    assert.ok(resMiddle.assignedTokenNumber! < resLate.assignedTokenNumber!);
  });

  test('2. Idempotency Replay skips duplicates without incrementing tokens or duplicate billing', async () => {
    const intake: OfflineIntakeItem = {
      clientOfflineId: 'OFF-10',
      idempotencyKey: 'b1000000-0000-4000-8000-000000000010',
      offlineRecordedAt: '2026-11-04T18:10:00.000Z',
      patientName: 'Vikram Joshi',
      patientPhone: '9826044444',
      patientAge: 39,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.PAID_CASH,
      amount: 500,
    };

    const dto: BatchSyncIntakeDTO = {
      clinicId,
      batchId: 'batch-replay-001',
      syncedAt: new Date().toISOString(),
      intakes: [intake],
    };

    // First sync
    const firstRes = await offlineSyncService.syncBatch(dto, defaultActor);
    assert.equal(firstRes.synchronizedCount, 1);
    const assignedToken = firstRes.results[0]!.assignedTokenNumber;

    // Resubmit exact same batch (e.g. network retry)
    const secondRes = await offlineSyncService.syncBatch(dto, defaultActor);
    assert.equal(secondRes.synchronizedCount, 0);
    assert.equal(secondRes.duplicateCount, 1);
    assert.equal(secondRes.results[0]!.status, 'DUPLICATE_SKIPPED');
    assert.equal(secondRes.results[0]!.assignedTokenNumber, assignedToken);
  });

  test('3. Partial Failure resilience: invalid items fail individually without dropping valid items', async () => {
    const validIntake: OfflineIntakeItem = {
      clientOfflineId: 'OFF-OK',
      idempotencyKey: 'c1000000-0000-4000-8000-000000000021',
      offlineRecordedAt: '2026-11-04T18:20:00.000Z',
      patientName: 'Pooja Nair',
      patientPhone: '9826055555',
      patientAge: 27,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.PAID_CASH,
      amount: 500,
    };

    const invalidIntake: OfflineIntakeItem = {
      clientOfflineId: 'OFF-BAD',
      idempotencyKey: 'c2000000-0000-4000-8000-000000000022',
      offlineRecordedAt: '2026-11-04T18:21:00.000Z',
      patientName: 'Bad Record',
      patientPhone: '12345', // Invalid phone
      patientAge: 30,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.PAID_CASH,
      amount: 500,
    };

    const dto: BatchSyncIntakeDTO = {
      clinicId,
      batchId: 'batch-partial-001',
      syncedAt: new Date().toISOString(),
      intakes: [validIntake, invalidIntake],
    };

    const response = await offlineSyncService.syncBatch(dto, defaultActor);
    assert.equal(response.totalSubmitted, 2);
    assert.equal(response.synchronizedCount, 1);
    assert.equal(response.failedCount, 1);

    const okResult = response.results.find((r) => r.clientOfflineId === 'OFF-OK');
    const badResult = response.results.find((r) => r.clientOfflineId === 'OFF-BAD');

    assert.equal(okResult?.status, 'SYNCHRONIZED');
    assert.equal(badResult?.status, 'FAILED');
    assert.ok(badResult?.errorMessage?.includes('INVALID_MOBILE'));
  });

  test('4. Cashiering ledger records synchronized offline payments', async () => {
    const today = new Date().toISOString().split('T')[0]!;
    const intake: OfflineIntakeItem = {
      clientOfflineId: 'OFF-PAY',
      idempotencyKey: 'd1000000-0000-4000-8000-000000000031',
      offlineRecordedAt: `${today}T18:00:00.000Z`,
      patientName: 'Rohan Gupta',
      patientPhone: '9826066666',
      patientAge: 52,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.PAID_CASH,
      amount: 600,
    };

    const dto: BatchSyncIntakeDTO = {
      clinicId,
      batchId: 'batch-cash-001',
      syncedAt: new Date().toISOString(),
      intakes: [intake],
    };

    await offlineSyncService.syncBatch(dto, defaultActor);

    // Verify cashiering summary reflects the 600 cash
    const summary = await cashieringService.getCashDrawerSummary(clinicId, today);
    assert.equal(summary.totalCollectedRupees, 600);
    assert.equal(summary.cashTotalRupees, 600);
  });

  test('5. Emergency triage severity is preserved upon synchronization', async () => {
    const emergencyIntake: OfflineIntakeItem = {
      clientOfflineId: 'OFF-EMERGENCY',
      idempotencyKey: 'e1000000-0000-4000-8000-000000000041',
      offlineRecordedAt: '2026-11-04T18:12:00.000Z',
      patientName: 'Emergency Patient',
      patientPhone: '9826077777',
      patientAge: 61,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.PAID_CASH,
      amount: 500,
      triageSeverity: TriageSeverity.EMERGENCY,
      notes: 'Severe chest pain arriving during internet blackout',
    };

    const dto: BatchSyncIntakeDTO = {
      clinicId,
      batchId: 'batch-emg-001',
      syncedAt: new Date().toISOString(),
      intakes: [emergencyIntake],
    };

    const res = await offlineSyncService.syncBatch(dto, defaultActor);
    assert.equal(res.synchronizedCount, 1);

    const appt = await appointmentService.getAppointmentById(res.results[0]!.appointmentId!);
    assert.equal(appt?.triageSeverity, TriageSeverity.EMERGENCY);
  });

  test('6. RBAC Guard: Doctor-Dedicated compounder cannot sync intakes for another doctor', async () => {
    const doctor2Id = SEED_DATA.doctors[1]!.doctorId;

    const dedicatedActor: SyncActor = {
      userId: 'compounder-doc-01',
      role: UserRole.RECEPTIONIST,
      activeClinicId: clinicId,
      name: 'Dr. Sharma Dedicated Compounder',
      staffScope: StaffScope.DOCTOR_DEDICATED,
      dedicatedDoctorId: doctorId,
    };

    const unauthorizedIntake: OfflineIntakeItem = {
      clientOfflineId: 'OFF-OTHER-DOC',
      idempotencyKey: 'f1000000-0000-4000-8000-000000000051',
      offlineRecordedAt: '2026-11-04T18:10:00.000Z',
      patientName: 'Cross Doctor Patient',
      patientPhone: '9826088888',
      patientAge: 35,
      doctorId: doctor2Id, // Assigned to Doctor 2, not Doctor 1!
      chamberNumber: 'CH-2',
      paymentMode: PaymentMode.PAID_CASH,
      amount: 500,
    };

    const dto: BatchSyncIntakeDTO = {
      clinicId,
      batchId: 'batch-unauth-001',
      syncedAt: new Date().toISOString(),
      intakes: [unauthorizedIntake],
    };

    await assert.rejects(
      async () => {
        await offlineSyncService.syncBatch(dto, dedicatedActor);
      },
      (err: Error) => {
        assert.ok(err.message.includes('FORBIDDEN_SCOPE'));
        return true;
      }
    );
  });

  test('7. REST API: POST /api/v1/reception/intake/batch-sync returns 200 OK with BatchSyncResponse', async () => {
    const app = createApiServer();

    // Generate receptionist auth token
    const token = authService.signToken({
      sub: 'test-rec-user',
      mobile: '9826099999',
      role: UserRole.RECEPTIONIST,
      clinicId,
      staffScope: StaffScope.CLINIC_WIDE,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const intake: OfflineIntakeItem = {
      clientOfflineId: 'OFF-HTTP',
      idempotencyKey: 'f7000000-0000-4000-8000-000000000061',
      offlineRecordedAt: '2026-11-04T18:00:00.000Z',
      patientName: 'HTTP Patient',
      patientPhone: '9826012345',
      patientAge: 40,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.PAID_CASH,
      amount: 500,
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reception/intake/batch-sync',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        clinicId,
        batchId: 'http-batch-001',
        syncedAt: new Date().toISOString(),
        intakes: [intake],
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.batchId, 'http-batch-001');
    assert.equal(body.synchronizedCount, 1);
    assert.equal(body.results[0].status, 'SYNCHRONIZED');

    await app.close();
  });
});
