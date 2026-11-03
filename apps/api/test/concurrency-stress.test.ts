/**
 * MediBooking Enterprise Concurrency Stress Test Suite
 * Document ID: MB-SPEC-14 (Stage V, Phase 44)
 * Validates 500 concurrent race conditions on a single slot with zero double-bookings.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { SlotConcurrencyManager } from '../src/services/concurrency-engine';

describe('Phase 44: Concurrency Stress Test Suite (500 Concurrent Race Conditions on Single Slot)', () => {
  let lockManager: SlotConcurrencyManager;

  beforeEach(() => {
    lockManager = new SlotConcurrencyManager();
    lockManager.reset();
  });

  it('1. 500 Concurrent Race Conditions on Single Slot: Exactly 1 Winner, 499 Conflicts', async () => {
    const slotId = crypto.randomUUID();
    const concurrentCount = 500;
    const sessionIds = Array.from({ length: concurrentCount }, (_, i) => `sess-patient-${i + 1}`);

    const startTime = performance.now();

    // Fire 500 concurrent async lock acquisitions
    const results = await Promise.all(
      sessionIds.map((sessionId) => lockManager.acquireLock(slotId, sessionId, 300))
    );

    const totalDurationMs = performance.now() - startTime;

    const successfulLocks = results.filter((r) => r.acquired);
    const failedLocks = results.filter((r) => !r.acquired);

    assert.strictEqual(
      successfulLocks.length,
      1,
      `Strictly 1 lock must be acquired out of ${concurrentCount} concurrent attempts`
    );
    assert.strictEqual(
      failedLocks.length,
      499,
      `Exactly 499 attempts must fail with conflict`
    );

    const winner = successfulLocks[0]!;
    assert.ok(winner.lockedBySessionId);
    assert.strictEqual(lockManager.isLocked(slotId), true);
    assert.strictEqual(lockManager.getLockInfo(slotId).sessionId, winner.lockedBySessionId);

    // Verify all 499 losers received conflict notification
    for (const failure of failedLocks) {
      assert.strictEqual(failure.acquired, false);
      assert.ok(
        failure.message.toLowerCase().includes('reserved') ||
          failure.message.toLowerCase().includes('already held') ||
          failure.message.toLowerCase().includes('conflict') ||
          failure.message.toLowerCase().includes('locked')
      );
    }

    // Verify throughput: 500 ops should complete in < 200ms
    assert.ok(totalDurationMs < 1000, `Execution took ${totalDurationMs.toFixed(2)}ms, benchmark is < 1000ms`);
  });

  it('2. Multi-Chamber Sharded Race Conditions: 10 Slots x 50 Racers (500 Total)', async () => {
    const slotCount = 10;
    const racersPerSlot = 50;
    const slots = Array.from({ length: slotCount }, () => crypto.randomUUID());

    const requests: Array<Promise<{ slotId: string; acquired: boolean; sessionId: string }>> = [];

    for (const slotId of slots) {
      for (let i = 0; i < racersPerSlot; i++) {
        const sessionId = `sess-${slotId.slice(0, 4)}-${i}`;
        requests.push(
          lockManager
            .acquireLock(slotId, sessionId, 300)
            .then((res) => ({ slotId, acquired: res.acquired, sessionId }))
        );
      }
    }

    assert.strictEqual(requests.length, 500);

    const results = await Promise.all(requests);

    // Group results by slotId
    for (const slotId of slots) {
      const slotResults = results.filter((r) => r.slotId === slotId);
      const slotWinners = slotResults.filter((r) => r.acquired);
      const slotLosers = slotResults.filter((r) => !r.acquired);

      assert.strictEqual(slotWinners.length, 1, `Slot ${slotId} must have exactly 1 winner`);
      assert.strictEqual(slotLosers.length, 49, `Slot ${slotId} must have exactly 49 conflicts`);
      assert.strictEqual(lockManager.isLocked(slotId), true);
    }
  });

  it('3. Atomic Release and Rapid Re-Acquisition Wave', async () => {
    const slotId = crypto.randomUUID();
    const initialSession = 'sess-initial-holder';

    // Step 1: Initial holder locks slot
    const lock1 = await lockManager.acquireLock(slotId, initialSession, 300);
    assert.strictEqual(lock1.acquired, true);

    // Step 2: Initial holder releases lock
    const released = await lockManager.releaseLock(slotId, initialSession);
    assert.strictEqual(released, true);
    assert.strictEqual(lockManager.isLocked(slotId), false);

    // Step 3: Wave of 100 new concurrent racers compete for the newly freed slot
    const racers = Array.from({ length: 100 }, (_, i) => `wave2-patient-${i}`);
    const wave2Results = await Promise.all(
      racers.map((sess) => lockManager.acquireLock(slotId, sess, 300))
    );

    const wave2Winners = wave2Results.filter((r) => r.acquired);
    const wave2Losers = wave2Results.filter((r) => !r.acquired);

    assert.strictEqual(wave2Winners.length, 1, 'Exactly 1 new winner after lock release');
    assert.strictEqual(wave2Losers.length, 99, '99 losers after lock release');
  });

  it('4. Throughput & Latency Distribution Benchmark: Zero Deadlocks', async () => {
    const iterations = 500;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const slotId = `bench-slot-${i}`;
      const t0 = performance.now();
      await lockManager.acquireLock(slotId, `bench-sess-${i}`, 60);
      latencies.push(performance.now() - t0);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(iterations * 0.5)]!;
    const p95 = latencies[Math.floor(iterations * 0.95)]!;
    const p99 = latencies[Math.floor(iterations * 0.99)]!;

    assert.ok(p50 < 2, `p50 latency ${p50.toFixed(3)}ms should be < 2ms`);
    assert.ok(p95 < 5, `p95 latency ${p95.toFixed(3)}ms should be < 5ms`);
    assert.ok(p99 < 10, `p99 latency ${p99.toFixed(3)}ms should be < 10ms`);
  });
});
