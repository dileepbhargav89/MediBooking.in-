/**
 * MediBooking Concurrency Engine
 * Implements atomic 5-minute mutex locks on availability slots.
 * Prevents race conditions between simultaneous online patient bookings and front-desk walk-in intakes.
 */

export interface LockResult {
  acquired: boolean;
  slotId: string;
  lockedBySessionId?: string;
  ttlSecondsRemaining?: number;
  message: string;
}

export class SlotConcurrencyManager {
  private inMemoryLocks = new Map<string, { sessionId: string; expiresAt: number }>();

  /**
   * Atomic lock acquisition (simulates Redis GET + SET NX EX 300)
   * @param slotId UUID of availability slot
   * @param sessionId Patient checkout session or Receptionist token
   * @param ttlSeconds Lock lifetime (default 300s / 5 minutes)
   */
  public async acquireLock(
    slotId: string,
    sessionId: string,
    ttlSeconds: number = 300
  ): Promise<LockResult> {
    const now = Date.now();
    const existing = this.inMemoryLocks.get(slotId);

    // If lock exists and has not expired
    if (existing && existing.expiresAt > now) {
      if (existing.sessionId === sessionId) {
        // Renew lock for current owner
        existing.expiresAt = now + ttlSeconds * 1000;
        return {
          acquired: true,
          slotId,
          lockedBySessionId: sessionId,
          ttlSecondsRemaining: ttlSeconds,
          message: 'Lock renewed successfully',
        };
      }
      return {
        acquired: false,
        slotId,
        lockedBySessionId: existing.sessionId,
        ttlSecondsRemaining: Math.ceil((existing.expiresAt - now) / 1000),
        message: 'Slot is currently being reserved by another patient or reception desk',
      };
    }

    // Acquire new lock
    this.inMemoryLocks.set(slotId, {
      sessionId,
      expiresAt: now + ttlSeconds * 1000,
    });

    return {
      acquired: true,
      slotId,
      lockedBySessionId: sessionId,
      ttlSecondsRemaining: ttlSeconds,
      message: 'Slot locked exclusively for 5 minutes',
    };
  }

  /**
   * Release lock when patient abandons cart or checkout fails
   */
  public async releaseLock(slotId: string, sessionId: string): Promise<boolean> {
    const existing = this.inMemoryLocks.get(slotId);
    if (existing && existing.sessionId === sessionId) {
      this.inMemoryLocks.delete(slotId);
      return true;
    }
    return false;
  }

  /**
   * Finalize booking commit
   */
  public async commitBooking(slotId: string, sessionId: string): Promise<boolean> {
    const existing = this.inMemoryLocks.get(slotId);
    if (!existing || (existing.sessionId === sessionId && existing.expiresAt > Date.now())) {
      this.inMemoryLocks.delete(slotId);
      return true;
    }
    return false;
  }

  /**
   * Checks whether a slot is currently available
   */
  public isLocked(slotId: string): boolean {
    const existing = this.inMemoryLocks.get(slotId);
    if (!existing) return false;
    if (existing.expiresAt <= Date.now()) {
      this.inMemoryLocks.delete(slotId);
      return false;
    }
    return true;
  }
}

export const slotLockManager = new SlotConcurrencyManager();

