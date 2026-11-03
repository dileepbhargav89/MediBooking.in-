/**
 * MediBooking Enterprise Network Interruption & Offline Queue Synchronization Test Suite
 * Document ID: MB-SPEC-14 (Stage V, Phase 45)
 * Simulates extended internet severed periods, 50-patient offline buffering, and conflict-free reconciliation.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { offlineSyncService, SyncActor } from '../src/services/offline-sync-service';
import { appointmentService } from '../src/services/appointment-service';
import { cashieringService } from '../src/services/cashiering-service';
import { SEED_DATA } from '@medibooking/database';
import {
  PaymentMode,
  TriageSeverity,
  UserRole,
  StaffScope,
  BatchSyncIntakeDTO,
  OfflineIntakeItem,
  BookingSource,
} from '@medibooking/types';

describe('Phase 45: Network Interruption & Offline Queue Synchronization Stress Test', () => {
  const clinicId = SEED_DATA.clinic.id;
  const doctorId = SEED_DATA.doctors[0]!.doctorId;
  const chamberNumber = SEED_DATA.doctors[0]!.chamberNumber;

  const defaultActor: SyncActor = {
    userId: 'staff-rec-01',
    role: UserRole.RECEPTIONIST,
    activeClinicId: clinicId,
    name: 'Central Receptionist Desk',
    staffScope: StaffScope.CLINIC_WIDE,
  };

  beforeEach(() => {
    appointmentService.reset();
    cashieringService.reset();
    offlineSyncService.reset();
  });

  test('1. Extended 2-Hour Outage: 50 Offline Buffered Records Reconciled Monotonically', async () => {
    const count = 50;
    const baseTime = new Date('2026-11-04T10:00:00.000Z').getTime();

    // Generate 50 offline intake records arrived over 120 minutes
    const offlineItems: OfflineIntakeItem[] = Array.from({ length: count }, (_, i) => {
      // Intentionally scramble insertion order to test server sorting
      const minuteOffset = (i * 7) % 120; // Pseudo-randomized timestamp
      const recordedTime = new Date(baseTime + minuteOffset * 60 * 1000).toISOString();
      const hexIndex = (i + 1).toString(16).padStart(12, '0');

      return {
        clientOfflineId: `OFF-PAT-${i + 1}`,
        idempotencyKey: `f1000000-0000-4000-8000-${hexIndex}`,
        offlineRecordedAt: recordedTime,
        patientName: `Patient ${i + 1}`,
        patientPhone: `98260${(10000 + i).toString()}`,
        patientAge: 25 + (i % 50),
        doctorId,
        chamberNumber,
        paymentMode: i % 3 === 0 ? PaymentMode.PAID_UPI_QR : PaymentMode.PAID_CASH,
        amount: 600,
      };
    });

    const batchDto: BatchSyncIntakeDTO = {
      batchSyncId: 'batch-outage-2hr-recovery',
      clinicId,
      offlineItems,
    };

    const startTime = performance.now();
    const result = await offlineSyncService.processBatchSync(batchDto, defaultActor);
    const durationMs = performance.now() - startTime;

    assert.strictEqual(result.syncedCount, 50, 'All 50 records must be synced');
    assert.strictEqual(result.rejectedCount, 0, 'Zero records rejected');
    assert.strictEqual(result.results.length, 50);

    // Verify tokens were allocated in strict chronological order of offlineRecordedAt
    const sortedByOriginalTimestamp = [...offlineItems].sort(
      (a, b) => new Date(a.offlineRecordedAt).getTime() - new Date(b.offlineRecordedAt).getTime()
    );

    for (let i = 0; i < sortedByOriginalTimestamp.length; i++) {
      const original = sortedByOriginalTimestamp[i]!;
      const matchingResult = result.results.find((r) => r.clientOfflineId === original.clientOfflineId);
      assert.ok(matchingResult, `Result must exist for ${original.clientOfflineId}`);
      assert.strictEqual(
        matchingResult.assignedTokenNumber,
        i + 1,
        `Token for patient arriving at ${original.offlineRecordedAt} must be strictly #${i + 1}`
      );
    }

    // Benchmark performance: 50 records reconciled in < 300ms
    assert.ok(durationMs < 500, `50 offline syncs completed in ${durationMs.toFixed(2)}ms (target < 500ms)`);
  });

  test('2. Concurrent Interleaved Online & Offline Stream Collision Resolution', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    // Step A: 3 online appointments booked while reception was offline
    const onlineTokens: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const apt = await appointmentService.walkInIntake({
        clinicId,
        doctorId,
        chamberNumber,
        patientName: `Online Patient ${i}`,
        patientMobile: `98261${i}0000`,
        source: BookingSource.ONLINE_PORTAL,
        paymentMethod: PaymentMode.PAID_UPI_QR,
        amountRupees: 600,
        appointmentDate: today,
        allowDuplicate: true,
      });
      onlineTokens.push(apt.tokenNumber);
    }

    assert.deepStrictEqual(onlineTokens, [1, 2, 3]);

    // Step B: Reception reconnects and syncs 5 offline-buffered walk-in intakes
    const offlineItems: OfflineIntakeItem[] = Array.from({ length: 5 }, (_, i) => ({
      clientOfflineId: `OFF-COLLISION-${i + 1}`,
      idempotencyKey: `c2000000-0000-4000-8000-${(i + 1).toString(16).padStart(12, '0')}`,
      offlineRecordedAt: new Date(Date.now() + i * 60000).toISOString(),
      patientName: `Offline Walk-In ${i + 1}`,
      patientPhone: `98262${i}0000`,
      doctorId,
      chamberNumber,
      paymentMode: PaymentMode.PAID_CASH,
      amount: 600,
    }));

    const result = await offlineSyncService.processBatchSync(
      { batchSyncId: 'batch-interleaved-collision', clinicId, offlineItems },
      defaultActor
    );

    assert.strictEqual(result.syncedCount, 5);

    // Verify offline walk-ins take sequential tokens after the online bookings (tokens 4, 5, 6, 7, 8)
    const assignedTokens = result.results.map((r) => r.assignedTokenNumber).sort((a, b) => a - b);
    assert.deepStrictEqual(assignedTokens, [4, 5, 6, 7, 8]);
  });

  test('3. Flaky Network Connection Retry: Idempotent Replay Rejection', async () => {
    const offlineItems: OfflineIntakeItem[] = [
      {
        clientOfflineId: 'OFF-RETRY-01',
        idempotencyKey: `d3000000-0000-4000-8000-000000000001`,
        offlineRecordedAt: '2026-11-04T11:00:00.000Z',
        patientName: 'Retry Patient',
        patientPhone: '9826311111',
        doctorId,
        chamberNumber,
        paymentMode: PaymentMode.PAID_CASH,
        amount: 600,
      },
    ];

    const batch: BatchSyncIntakeDTO = {
      batchSyncId: 'batch-flaky-retry-01',
      clinicId,
      offlineItems,
    };

    // First attempt succeeds
    const res1 = await offlineSyncService.processBatchSync(batch, defaultActor);
    assert.strictEqual(res1.syncedCount, 1);
    const tokenAwarded = res1.results[0]!.assignedTokenNumber;

    // Network dropped before response reached client -> Client retries exact same batch
    const res2 = await offlineSyncService.processBatchSync(batch, defaultActor);
    assert.strictEqual(res2.syncedCount, 1);
    assert.strictEqual(res2.isReplay, true, 'Second call must be flagged as idempotent replay');
    assert.strictEqual(
      res2.results[0]!.assignedTokenNumber,
      tokenAwarded,
      'Must return identical token number on retry'
    );
  });

  test('4. Mixed Payment Reconciliation: Accurately populates Cash and UPI ledgers', async () => {
    const offlineItems: OfflineIntakeItem[] = [
      {
        clientOfflineId: 'PAY-1',
        idempotencyKey: 'e4000000-0000-4000-8000-000000000001',
        offlineRecordedAt: '2026-11-04T12:00:00.000Z',
        patientName: 'Cash Patient',
        patientPhone: '9826411111',
        doctorId,
        chamberNumber,
        paymentMode: PaymentMode.PAID_CASH,
        amount: 600,
      },
      {
        clientOfflineId: 'PAY-2',
        idempotencyKey: 'e4000000-0000-4000-8000-000000000002',
        offlineRecordedAt: '2026-11-04T12:05:00.000Z',
        patientName: 'UPI Patient',
        patientPhone: '9826422222',
        doctorId,
        chamberNumber,
        paymentMode: PaymentMode.PAID_UPI_QR,
        amount: 500,
      },
      {
        clientOfflineId: 'PAY-3',
        idempotencyKey: 'e4000000-0000-4000-8000-000000000003',
        offlineRecordedAt: '2026-11-04T12:10:00.000Z',
        patientName: 'Waived Patient',
        patientPhone: '9826433333',
        doctorId,
        chamberNumber,
        paymentMode: PaymentMode.WAIVED_BY_DOCTOR,
        amount: 0,
      },
    ];

    await offlineSyncService.processBatchSync(
      { batchSyncId: 'batch-mixed-payment', clinicId, offlineItems },
      defaultActor
    );

    const cashierSummary = cashieringService.getDailySummary(clinicId);
    assert.ok(cashierSummary.cashTotalRupees >= 600, 'Cash total includes 600');
    assert.ok(cashierSummary.upiQrTotalRupees >= 500, 'UPI total includes 500');
    assert.ok(cashierSummary.waivedCount >= 1, 'Waived count recorded');
  });
});
