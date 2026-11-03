import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  dpdpAuditService,
  GENESIS_HASH,
  sanitizeAuditDetails,
} from '../src/services/dpdp-audit-service';
import { createApiServer } from '../src/server';
import { UserRole } from '@medibooking/types';

describe('Phase 29: DPDP Act 2023 Tamper-Evident Immutable Audit Logger', () => {
  const clinicA = 'c1010000-0000-4000-8000-000000000001';
  const clinicB = 'c1010000-0000-4000-8000-000000000002';
  const actorReceptionist = 'a1010000-0000-4000-8000-000000000001';
  const actorDoctor = 'd1010000-0000-4000-8000-000000000001';

  beforeEach(() => {
    dpdpAuditService.clearLogs();
  });

  it('1. Genesis Block and Monotonic Sequence Chaining', async () => {
    // Sequence 1: Genesis block
    const entry1 = await dpdpAuditService.logAction({
      clinicId: clinicA,
      actorId: actorReceptionist,
      actorRole: UserRole.RECEPTIONIST,
      action: 'PATIENT_INTAKE',
      entityType: 'APPOINTMENT',
      entityId: 'apt-001',
      details: { tokenNumber: 1, fee: 500 },
    });

    assert.equal(entry1.sequenceNumber, 1);
    assert.equal(entry1.previousHash, GENESIS_HASH);
    assert.equal(entry1.currentHash.length, 64);

    // Sequence 2: Chained from block 1
    const entry2 = await dpdpAuditService.logAction({
      clinicId: clinicA,
      actorId: actorDoctor,
      actorRole: UserRole.DOCTOR,
      action: 'DATA_ACCESS',
      entityType: 'PATIENT',
      entityId: 'pat-001',
      details: { purpose: 'Clinical Consultation' },
    });

    assert.equal(entry2.sequenceNumber, 2);
    assert.equal(entry2.previousHash, entry1.currentHash);
    assert.notEqual(entry2.currentHash, entry1.currentHash);

    // Sequence 3: Chained from block 2
    const entry3 = await dpdpAuditService.logAction({
      clinicId: clinicA,
      actorId: actorReceptionist,
      actorRole: UserRole.RECEPTIONIST,
      action: 'PAYMENT_COLLECTED',
      entityType: 'PAYMENT',
      entityId: 'pay-001',
      details: { amount: 500, mode: 'CASH' },
    });

    assert.equal(entry3.sequenceNumber, 3);
    assert.equal(entry3.previousHash, entry2.currentHash);
  });

  it('2. Automatic PII Redaction preserves privacy in audit payloads', () => {
    const raw = {
      patientName: 'Devendra Patel',
      mobile: '9826012345',
      contactEmail: 'devendra.patel@gmail.com',
      age: 45,
      nested: {
        guardianPhone: '9893098765',
      },
    };

    const sanitized = sanitizeAuditDetails(raw);
    assert.equal(sanitized.patientName, 'Devendra Patel');
    assert.equal(sanitized.mobile, '98260*****');
    assert.equal(sanitized.contactEmail, 'd***@gmail.com');
    assert.equal(sanitized.age, 45);
    assert.equal(sanitized.nested.guardianPhone, '98930*****');
  });

  it('3. Cryptographic Verification confirms integrity of untouched chain', async () => {
    for (let i = 1; i <= 5; i++) {
      await dpdpAuditService.logAction({
        clinicId: clinicA,
        actorId: actorReceptionist,
        actorRole: UserRole.RECEPTIONIST,
        action: 'PATIENT_INTAKE',
        entityType: 'APPOINTMENT',
        entityId: `apt-00${i}`,
        details: { tokenNumber: i },
      });
    }

    const verification = dpdpAuditService.verifyChain(clinicA);
    assert.equal(verification.valid, true);
    assert.equal(verification.totalEntries, 5);
    assert.equal(verification.tamperedSequenceNumber, undefined);
  });

  it('4. Cryptographic Verification detects unauthorized payload tampering', async () => {
    for (let i = 1; i <= 4; i++) {
      await dpdpAuditService.logAction({
        clinicId: clinicA,
        actorId: actorReceptionist,
        actorRole: UserRole.RECEPTIONIST,
        action: 'PATIENT_INTAKE',
        entityType: 'APPOINTMENT',
        entityId: `apt-00${i}`,
        details: { tokenNumber: i, fee: 500 },
      });
    }

    // Tamper with record #2's payload behind the scenes
    dpdpAuditService.tamperRecordForTesting(clinicA, 2, { tokenNumber: 2, fee: 0 });

    const verification = dpdpAuditService.verifyChain(clinicA);
    assert.equal(verification.valid, false);
    assert.equal(verification.tamperedSequenceNumber, 2);
    assert.ok(verification.reason?.includes('Cryptographic hash corruption detected at sequence 2'));
  });

  it('5. Cryptographic Verification detects unauthorized record deletion (gap break)', async () => {
    for (let i = 1; i <= 4; i++) {
      await dpdpAuditService.logAction({
        clinicId: clinicA,
        actorId: actorReceptionist,
        actorRole: UserRole.RECEPTIONIST,
        action: 'PATIENT_INTAKE',
        entityType: 'APPOINTMENT',
        entityId: `apt-00${i}`,
        details: { tokenNumber: i },
      });
    }

    // Maliciously delete record #2
    dpdpAuditService.deleteRecordForTesting(clinicA, 2);

    const verification = dpdpAuditService.verifyChain(clinicA);
    assert.equal(verification.valid, false);
    assert.ok(verification.reason?.includes('Sequence break detected at index 1'));
  });

  it('6. Multi-tenant isolation maintains completely independent chains per clinic', async () => {
    await dpdpAuditService.logAction({
      clinicId: clinicA,
      actorId: actorReceptionist,
      actorRole: UserRole.RECEPTIONIST,
      action: 'PATIENT_INTAKE',
      entityType: 'APPOINTMENT',
      entityId: 'apt-A1',
      details: { token: 1 },
    });

    await dpdpAuditService.logAction({
      clinicId: clinicB,
      actorId: actorReceptionist,
      actorRole: UserRole.RECEPTIONIST,
      action: 'PATIENT_INTAKE',
      entityType: 'APPOINTMENT',
      entityId: 'apt-B1',
      details: { token: 1 },
    });

    const verA = dpdpAuditService.verifyChain(clinicA);
    const verB = dpdpAuditService.verifyChain(clinicB);

    assert.equal(verA.valid, true);
    assert.equal(verA.totalEntries, 1);
    assert.equal(verB.valid, true);
    assert.equal(verB.totalEntries, 1);
  });

  it('7. REST API: POST /audit/log, GET /audit/logs, and GET /audit/verify', async () => {
    const server = await createApiServer();

    // 1. Post new log
    const postRes = await server.inject({
      method: 'POST',
      url: '/api/v1/audit/log',
      payload: {
        clinicId: clinicA,
        actorId: actorReceptionist,
        actorRole: UserRole.RECEPTIONIST,
        action: 'EMERGENCY_OVERRIDE',
        entityType: 'APPOINTMENT',
        entityId: 'apt-em-99',
        lawfulBasis: 'VITAL_INTERESTS',
        details: { reason: 'Severe cardiac pain', mobile: '9826099999' },
      },
    });

    assert.equal(postRes.statusCode, 201);
    const postJson = JSON.parse(postRes.body);
    assert.equal(postJson.success, true);
    assert.equal(postJson.entry.sequenceNumber, 1);
    assert.equal(postJson.entry.details.mobile, '98260*****');

    // 2. Query logs
    const queryRes = await server.inject({
      method: 'GET',
      url: `/api/v1/audit/logs?clinicId=${clinicA}`,
    });
    assert.equal(queryRes.statusCode, 200);
    const queryJson = JSON.parse(queryRes.body);
    assert.equal(queryJson.total, 1);
    assert.equal(queryJson.entries[0].action, 'EMERGENCY_OVERRIDE');

    // 3. Verify chain
    const verifyRes = await server.inject({
      method: 'GET',
      url: `/api/v1/audit/verify?clinicId=${clinicA}`,
    });
    assert.equal(verifyRes.statusCode, 200);
    const verifyJson = JSON.parse(verifyRes.body);
    assert.equal(verifyJson.success, true);
    assert.equal(verifyJson.verification.valid, true);

    // 4. Missing clinicId rejection
    const badVerify = await server.inject({
      method: 'GET',
      url: '/api/v1/audit/verify',
    });
    assert.equal(badVerify.statusCode, 400);

    await server.close();
  });
});
