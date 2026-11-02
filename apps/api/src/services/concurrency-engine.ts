/**
 * MediBooking Distributed Concurrency Engine
 * Implements atomic 5-minute mutex locks on availability slots using Redis Lua scripts.
 * Supports Upstash Redis REST API with seamless in-memory fallback for zero-dependency test/offline execution.
 */

import { ENV } from '../config/env';

export interface LockResult {
  acquired: boolean;
  slotId: string;
  lockedBySessionId?: string;
  ttlSecondsRemaining?: number;
  message: string;
}

export const LUA_ACQUIRE_LOCK = `
local current = redis.call('GET', KEYS[1])
if not current then
  redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
  return 1
elseif current == ARGV[1] then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
  return 2
else
  local ttl = redis.call('TTL', KEYS[1])
  return {0, ttl, current}
end
`;

export const LUA_RELEASE_LOCK = `
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

export const LUA_COMMIT_LOCK = `
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] or not current then
  redis.call('DEL', KEYS[1])
  return 1
else
  return 0
end
`;

export class MemoryRedisDriver {
  private locks = new Map<string, { sessionId: string; expiresAt: number }>();

  async evalAcquire(key: string, sessionId: string, ttlSeconds: number): Promise<LockResult> {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now) {
      if (existing.sessionId === sessionId) {
        existing.expiresAt = now + ttlSeconds * 1000;
        return {
          acquired: true,
          slotId: key.replace('lock:slot:', ''),
          lockedBySessionId: sessionId,
          ttlSecondsRemaining: ttlSeconds,
          message: 'Lock renewed successfully',
        };
      }
      return {
        acquired: false,
        slotId: key.replace('lock:slot:', ''),
        lockedBySessionId: existing.sessionId,
        ttlSecondsRemaining: Math.ceil((existing.expiresAt - now) / 1000),
        message: 'Slot is currently being reserved by another patient or reception desk',
      };
    }

    this.locks.set(key, {
      sessionId,
      expiresAt: now + ttlSeconds * 1000,
    });

    return {
      acquired: true,
      slotId: key.replace('lock:slot:', ''),
      lockedBySessionId: sessionId,
      ttlSecondsRemaining: ttlSeconds,
      message: 'Slot locked exclusively for 5 minutes',
    };
  }

  async evalRelease(key: string, sessionId: string): Promise<boolean> {
    const existing = this.locks.get(key);
    if (existing && existing.sessionId === sessionId) {
      this.locks.delete(key);
      return true;
    }
    return false;
  }

  async evalCommit(key: string, sessionId: string): Promise<boolean> {
    const existing = this.locks.get(key);
    if (!existing || (existing.sessionId === sessionId && existing.expiresAt > Date.now())) {
      this.locks.delete(key);
      return true;
    }
    return false;
  }

  isLocked(key: string): boolean {
    const existing = this.locks.get(key);
    if (!existing) return false;
    if (existing.expiresAt <= Date.now()) {
      this.locks.delete(key);
      return false;
    }
    return true;
  }

  getLockInfo(key: string): { isLocked: boolean; sessionId?: string; ttlSecondsRemaining?: number } {
    const existing = this.locks.get(key);
    if (!existing) return { isLocked: false };
    const now = Date.now();
    if (existing.expiresAt <= now) {
      this.locks.delete(key);
      return { isLocked: false };
    }
    return {
      isLocked: true,
      sessionId: existing.sessionId,
      ttlSecondsRemaining: Math.ceil((existing.expiresAt - now) / 1000),
    };
  }

  clear() {
    this.locks.clear();
  }
}

export class SlotConcurrencyManager {
  private memDriver = new MemoryRedisDriver();
  private upstashUrl = ENV.UPSTASH_REDIS_REST_URL;
  private upstashToken = ENV.UPSTASH_REDIS_REST_TOKEN;

  private formatKey(slotId: string): string {
    return `lock:slot:${slotId}`;
  }

  /**
   * Acquire or Renew 5-Minute Mutex Lock
   */
  public async acquireLock(
    slotId: string,
    sessionId: string,
    ttlSeconds: number = 300
  ): Promise<LockResult> {
    const key = this.formatKey(slotId);

    // If Upstash credentials configured, attempt remote evaluation
    if (this.upstashUrl && this.upstashToken) {
      try {
        const response = await fetch(this.upstashUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.upstashToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['EVAL', LUA_ACQUIRE_LOCK, '1', key, sessionId, String(ttlSeconds)]),
        });

        if (response.ok) {
          const data = (await response.json()) as { result: any };
          const res = data.result;

          if (res === 1) {
            return {
              acquired: true,
              slotId,
              lockedBySessionId: sessionId,
              ttlSecondsRemaining: ttlSeconds,
              message: 'Slot locked exclusively for 5 minutes',
            };
          }
          if (res === 2) {
            return {
              acquired: true,
              slotId,
              lockedBySessionId: sessionId,
              ttlSecondsRemaining: ttlSeconds,
              message: 'Lock renewed successfully',
            };
          }
          if (Array.isArray(res)) {
            const ttl = typeof res[1] === 'number' ? res[1] : ttlSeconds;
            const currentOwner = String(res[2] || '');
            return {
              acquired: false,
              slotId,
              lockedBySessionId: currentOwner,
              ttlSecondsRemaining: ttl > 0 ? ttl : ttlSeconds,
              message: 'Slot is currently being reserved by another patient or reception desk',
            };
          }
        }
      } catch (err) {
        // Fall back to memory driver on network glitch
      }
    }

    return this.memDriver.evalAcquire(key, sessionId, ttlSeconds);
  }

  /**
   * Release lock safely verifying ownership
   */
  public async releaseLock(slotId: string, sessionId: string): Promise<boolean> {
    const key = this.formatKey(slotId);

    if (this.upstashUrl && this.upstashToken) {
      try {
        const response = await fetch(this.upstashUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.upstashToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['EVAL', LUA_RELEASE_LOCK, '1', key, sessionId]),
        });

        if (response.ok) {
          const data = (await response.json()) as { result: number };
          return data.result === 1;
        }
      } catch (err) {
        // Fall back to memory driver
      }
    }

    return this.memDriver.evalRelease(key, sessionId);
  }

  /**
   * Finalize booking commit
   */
  public async commitBooking(slotId: string, sessionId: string): Promise<boolean> {
    const key = this.formatKey(slotId);

    if (this.upstashUrl && this.upstashToken) {
      try {
        const response = await fetch(this.upstashUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.upstashToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['EVAL', LUA_COMMIT_LOCK, '1', key, sessionId]),
        });

        if (response.ok) {
          const data = (await response.json()) as { result: number };
          return data.result === 1;
        }
      } catch (err) {
        // Fall back to memory driver
      }
    }

    return this.memDriver.evalCommit(key, sessionId);
  }

  /**
   * Check whether a slot is currently locked
   */
  public isLocked(slotId: string): boolean {
    const key = this.formatKey(slotId);
    return this.memDriver.isLocked(key);
  }

  /**
   * Get detailed lock information for a slot
   */
  public getLockInfo(slotId: string): { isLocked: boolean; sessionId?: string; ttlSecondsRemaining?: number } {
    const key = this.formatKey(slotId);
    return this.memDriver.getLockInfo(key);
  }

  /**
   * Test helper: clear locks
   */
  public reset() {
    this.memDriver.clear();
  }
}

export const slotLockManager = new SlotConcurrencyManager();
