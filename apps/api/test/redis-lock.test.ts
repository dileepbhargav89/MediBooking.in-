/**
 * MediBooking Enterprise Distributed Redis Lua Mutex Test Suite
 * Tests atomic mutex locking, renewal, conflict rejection, ownership-based release,
 * and high-concurrency race condition resolution.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import {
  SlotConcurrencyManager,
  LUA_ACQUIRE_LOCK,
  LUA_RELEASE_LOCK,
  LUA_COMMIT_LOCK,
} from '../src/services/concurrency-engine';

describe('Phase 9: Distributed Redis Lua Mutex Locking Engine', () => {
  let lockManager: SlotConcurrencyManager;

  beforeEach(() => {
    lockManager = new SlotConcurrencyManager();
    lockManager.reset();
  });

  describe('1. Lua Script Definition & Syntax Checks', () => {
    it('should export valid Redis Lua atomic scripts', () => {
      assert.ok(LUA_ACQUIRE_LOCK.includes("redis.call('SET'"), 'Acquire script must contain SET');
      assert.ok(LUA_ACQUIRE_LOCK.includes("redis.call('EXPIRE'"), 'Acquire script must support renewal');
      assert.ok(LUA_RELEASE_LOCK.includes("redis.call('DEL'"), 'Release script must contain DEL');
      assert.ok(LUA_COMMIT_LOCK.includes("redis.call('DEL'"), 'Commit script must contain DEL');
    });
  });

  describe('2. Mutex Acquisition & Renewal', () => {
    it('should grant 5-minute exclusive lock to first requester', async () => {
      const slotId = crypto.randomUUID();
      const sessionId = 'session-patient-alpha';

      const result = await lockManager.acquireLock(slotId, sessionId, 300);

      assert.strictEqual(result.acquired, true);
      assert.strictEqual(result.slotId, slotId);
      assert.strictEqual(result.lockedBySessionId, sessionId);
      assert.strictEqual(result.ttlSecondsRemaining, 300);
      assert.strictEqual(lockManager.isLocked(slotId), true);
    });

    it('should renew lock when requested by the current owner', async () => {
      const slotId = crypto.randomUUID();
      const sessionId = 'session-patient-alpha';

      await lockManager.acquireLock(slotId, sessionId, 300);

      const renewed = await lockManager.acquireLock(slotId, sessionId, 300);
      assert.strictEqual(renewed.acquired, true);
      assert.strictEqual(renewed.lockedBySessionId, sessionId);
      assert.strictEqual(renewed.message, 'Lock renewed successfully');
    });
  });

  describe('3. Concurrency Conflict & Safe Release', () => {
    it('should reject contender when slot is already locked by another session', async () => {
      const slotId = crypto.randomUUID();
      const patientA = 'session-patient-A';
      const patientB = 'session-patient-B';

      // Patient A locks slot
      const resA = await lockManager.acquireLock(slotId, patientA, 300);
      assert.strictEqual(resA.acquired, true);

      // Patient B attempts to lock same slot
      const resB = await lockManager.acquireLock(slotId, patientB, 300);
      assert.strictEqual(resB.acquired, false);
      assert.strictEqual(resB.lockedBySessionId, patientA);
      assert.ok(resB.message.includes('currently being reserved'));
    });

    it('should disallow unlocking by a session that does not own the lock', async () => {
      const slotId = crypto.randomUUID();
      const patientA = 'session-patient-A';
      const impostor = 'session-impostor';

      await lockManager.acquireLock(slotId, patientA, 300);

      // Impostor attempts to release Patient A's lock
      const releasedByImpostor = await lockManager.releaseLock(slotId, impostor);
      assert.strictEqual(releasedByImpostor, false);
      assert.strictEqual(lockManager.isLocked(slotId), true, 'Lock must remain active');

      // Genuine owner releases lock
      const releasedByOwner = await lockManager.releaseLock(slotId, patientA);
      assert.strictEqual(releasedByOwner, true);
      assert.strictEqual(lockManager.isLocked(slotId), false, 'Lock is now cleared');
    });

    it('should allow second patient to acquire slot immediately after owner releases', async () => {
      const slotId = crypto.randomUUID();
      const patientA = 'session-patient-A';
      const patientB = 'session-patient-B';

      await lockManager.acquireLock(slotId, patientA, 300);
      await lockManager.releaseLock(slotId, patientA);

      // Patient B now acquires
      const resB = await lockManager.acquireLock(slotId, patientB, 300);
      assert.strictEqual(resB.acquired, true);
      assert.strictEqual(resB.lockedBySessionId, patientB);
    });
  });

  describe('4. Final Booking Commit', () => {
    it('should atomically consume lock upon successful booking transaction', async () => {
      const slotId = crypto.randomUUID();
      const patient = 'session-patient-A';

      await lockManager.acquireLock(slotId, patient, 300);

      const committed = await lockManager.commitBooking(slotId, patient);
      assert.strictEqual(committed, true);
      assert.strictEqual(lockManager.isLocked(slotId), false);
    });
  });

  describe('5. High Concurrency Race Condition Simulation', () => {
    it('should ensure exactly ONE winner among 50 simultaneous parallel contenders', async () => {
      const slotId = crypto.randomUUID();
      const contenders = Array.from({ length: 50 }, (_, i) => `contender-session-${i + 1}`);

      // Fire 50 simultaneous lock attempts
      const results = await Promise.all(
        contenders.map((sessionId) => lockManager.acquireLock(slotId, sessionId, 300))
      );

      const winners = results.filter((r) => r.acquired);
      const losers = results.filter((r) => !r.acquired);

      assert.strictEqual(winners.length, 1, 'Exactly one contender must win the lock');
      assert.strictEqual(losers.length, 49, 'All other 49 contenders must be rejected');

      // All losers report the winner as the lock holder
      const winnerSessionId = winners[0].lockedBySessionId;
      losers.forEach((l) => {
        assert.strictEqual(l.lockedBySessionId, winnerSessionId);
      });
    });
  });
});

