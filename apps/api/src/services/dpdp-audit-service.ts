import { createHash, randomUUID } from 'crypto';
import {
  DpdpAuditAction,
  LawfulBasis,
  DpdpAuditLogEntry,
  CreateAuditLogDTO,
  AuditQueryFilter,
  AuditChainVerificationResult,
} from '@medibooking/types';

export const GENESIS_HASH = '0'.repeat(64);

/**
 * Deterministic JSON stringification with recursively sorted keys
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
  return '{' + entries.join(',') + '}';
}

/**
 * Automatic PII redaction according to DPDP principles
 */
export function sanitizeAuditDetails(details: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(details)) {
    if (typeof val === 'string') {
      // Indian phone number masking: 10 digits
      if (/^[6-9]\d{9}$/.test(val)) {
        sanitized[key] = `${val.slice(0, 5)}*****`;
      } else if (val.includes('@') && val.includes('.')) {
        // Email masking: j***@example.com
        const parts = val.split('@');
        const local = parts[0] || '';
        const domain = parts[1] || '';
        sanitized[key] = `${local[0] || 'x'}***@${domain}`;
      } else {
        sanitized[key] = val;
      }
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      sanitized[key] = sanitizeAuditDetails(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Computes cryptographically chained SHA-256 HMAC digest
 */
export function computeAuditEntryHash(
  previousHash: string,
  sequenceNumber: number,
  clinicId: string,
  actorId: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string,
  lawfulBasis: string,
  details: Record<string, any>,
  timestamp: string
): string {
  const payload = [
    previousHash,
    String(sequenceNumber),
    clinicId,
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    lawfulBasis,
    canonicalJsonStringify(details),
    timestamp,
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

export class DpdpAuditService {
  // Key: clinicId -> sequential immutable log chain
  private clinicChains = new Map<string, DpdpAuditLogEntry[]>();

  /**
   * Append a new tamper-evident audit record to the clinic's cryptographic chain
   */
  public async logAction(dto: CreateAuditLogDTO): Promise<DpdpAuditLogEntry> {
    const clinicId = dto.clinicId;
    let chain = this.clinicChains.get(clinicId);
    if (!chain) {
      chain = [];
      this.clinicChains.set(clinicId, chain);
    }

    const sequenceNumber = chain.length + 1;
    const lastEntry = chain[chain.length - 1];
    const previousHash = sequenceNumber === 1 || !lastEntry ? GENESIS_HASH : lastEntry.currentHash;
    const timestamp = dto.timestamp || new Date().toISOString();
    const lawfulBasis: LawfulBasis = dto.lawfulBasis || 'CONSENT';
    const sanitizedDetails = sanitizeAuditDetails(dto.details || {});

    const currentHash = computeAuditEntryHash(
      previousHash,
      sequenceNumber,
      clinicId,
      dto.actorId,
      dto.actorRole,
      dto.action,
      dto.entityType,
      dto.entityId,
      lawfulBasis,
      sanitizedDetails,
      timestamp
    );

    const entry: DpdpAuditLogEntry = {
      sequenceNumber,
      id: randomUUID(),
      clinicId,
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      action: dto.action,
      entityType: dto.entityType,
      entityId: dto.entityId,
      lawfulBasis,
      details: sanitizedDetails,
      clientIp: dto.clientIp,
      timestamp,
      previousHash,
      currentHash,
    };

    chain.push(entry);
    return entry;
  }

  /**
   * Cryptographically verifies the entire audit chain for a clinic
   */
  public verifyChain(clinicId: string): AuditChainVerificationResult {
    const verifiedAt = new Date().toISOString();
    const chain = this.clinicChains.get(clinicId) || [];

    if (chain.length === 0) {
      return {
        valid: true,
        clinicId,
        totalEntries: 0,
        verifiedAt,
      };
    }

    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i]!;
      const expectedSeq = i + 1;

      // 1. Monotonic sequence check
      if (entry.sequenceNumber !== expectedSeq) {
        return {
          valid: false,
          clinicId,
          totalEntries: chain.length,
          tamperedIndex: i,
          tamperedSequenceNumber: entry.sequenceNumber,
          tamperedId: entry.id,
          reason: `Sequence break detected at index ${i}: expected ${expectedSeq}, found ${entry.sequenceNumber}`,
          verifiedAt,
        };
      }

      // 2. Previous hash linkage check
      const prior = i === 0 ? null : chain[i - 1];
      const expectedPrevHash = i === 0 || !prior ? GENESIS_HASH : prior.currentHash;
      if (entry.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          clinicId,
          totalEntries: chain.length,
          tamperedIndex: i,
          tamperedSequenceNumber: entry.sequenceNumber,
          tamperedId: entry.id,
          reason: `Previous hash linkage mismatch at sequence ${entry.sequenceNumber}. Stored previousHash does not match prior block currentHash.`,
          verifiedAt,
        };
      }

      // 3. Cryptographic hash recomputation check
      const recomputedHash = computeAuditEntryHash(
        entry.previousHash,
        entry.sequenceNumber,
        entry.clinicId,
        entry.actorId,
        entry.actorRole,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.lawfulBasis,
        entry.details,
        entry.timestamp
      );

      if (entry.currentHash !== recomputedHash) {
        return {
          valid: false,
          clinicId,
          totalEntries: chain.length,
          tamperedIndex: i,
          tamperedSequenceNumber: entry.sequenceNumber,
          tamperedId: entry.id,
          reason: `Cryptographic hash corruption detected at sequence ${entry.sequenceNumber}. Recomputed SHA-256 does not match stored currentHash.`,
          verifiedAt,
        };
      }
    }

    return {
      valid: true,
      clinicId,
      totalEntries: chain.length,
      verifiedAt,
    };
  }

  /**
   * Filter and paginate audit logs
   */
  public queryLogs(filter: AuditQueryFilter): { total: number; entries: DpdpAuditLogEntry[] } {
    const chain = this.clinicChains.get(filter.clinicId) || [];
    let filtered = [...chain];

    if (filter.action) {
      filtered = filtered.filter((e) => e.action === filter.action);
    }
    if (filter.actorRole) {
      filtered = filtered.filter((e) => e.actorRole === filter.actorRole);
    }
    if (filter.fromDate) {
      filtered = filtered.filter((e) => e.timestamp >= filter.fromDate!);
    }
    if (filter.toDate) {
      filtered = filtered.filter((e) => e.timestamp <= filter.toDate!);
    }

    // Default: latest logs first
    filtered.reverse();

    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      total: filtered.length,
      entries: paginated,
    };
  }

  /**
   * Test helper: simulates database tampering for unit test verification
   */
  public tamperRecordForTesting(
    clinicId: string,
    sequenceNumber: number,
    modifiedDetails: Record<string, any>
  ): void {
    const chain = this.clinicChains.get(clinicId);
    if (!chain) return;
    const target = chain.find((e) => e.sequenceNumber === sequenceNumber);
    if (target) {
      target.details = modifiedDetails;
    }
  }

  /**
   * Test helper: simulates row deletion for unit test verification
   */
  public deleteRecordForTesting(clinicId: string, sequenceNumber: number): void {
    const chain = this.clinicChains.get(clinicId);
    if (!chain) return;
    const idx = chain.findIndex((e) => e.sequenceNumber === sequenceNumber);
    if (idx !== -1) {
      chain.splice(idx, 1);
    }
  }

  /**
   * Clear all or specific clinic logs (for test teardown)
   */
  public clearLogs(clinicId?: string): void {
    if (clinicId) {
      this.clinicChains.delete(clinicId);
    } else {
      this.clinicChains.clear();
    }
  }
}

export const dpdpAuditService = new DpdpAuditService();
