/**
 * Phase 47: Bhopal 10-Clinic Pilot Seed Migration & Deployment Test Suite
 * Validates dataset integrity, geographical consistency, NMC credential verification, and migration execution.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BHOPAL_10_CLINICS,
  migrateBhopalPilotDataset,
} from '../src/seed-bhopal-pilot';

describe('Phase 47: Bhopal 10-Clinic Pilot Seed Migration & Deployment Scripts', () => {
  test('1. 10-Clinic Multi-Tenant Polyclinic Coverage across Bhopal Hubs', () => {
    assert.strictEqual(BHOPAL_10_CLINICS.length, 10, 'Exactly 10 polyclinics provisioned');

    const expectedLocalities = [
      'MP Nagar Zone-II',
      'Arera Colony E-3',
      'Kolar Road',
      'TT Nagar',
      'New Market',
      'Hoshangabad Road',
      'Shahpura',
      'Ayodhya Bypass',
      'Indrapuri',
      'Bairagarh',
    ];

    const actualLocalities = BHOPAL_10_CLINICS.map((c) => c.locality);
    for (const loc of expectedLocalities) {
      assert.ok(
        actualLocalities.includes(loc),
        `Locality '${loc}' must be represented in Bhopal pilot dataset`
      );
    }

    // Verify all clinics reside in Bhopal, MP with valid postal codes (4620xx)
    for (const clinic of BHOPAL_10_CLINICS) {
      assert.strictEqual(clinic.city, 'Bhopal');
      assert.strictEqual(clinic.state, 'Madhya Pradesh');
      assert.ok(/^4620\d{2}$/.test(clinic.pincode), `Pincode ${clinic.pincode} must be valid Bhopal code`);
      assert.strictEqual(clinic.isActive, true);
      assert.strictEqual(clinic.tier, 'MULTI_CHAMBER_POLYCLINIC');
    }
  });

  test('2. Multi-Chamber Uniformity: Exactly 4 Chambers (CH-1 to CH-4) per Clinic', () => {
    for (const clinic of BHOPAL_10_CLINICS) {
      assert.strictEqual(
        clinic.chambers.length,
        4,
        `Clinic ${clinic.name} must provision exactly 4 consultation chambers`
      );

      const chamberNumbers = clinic.chambers.map((c) => c.chamberNumber).sort();
      assert.deepStrictEqual(
        chamberNumbers,
        ['CH-1', 'CH-2', 'CH-3', 'CH-4'],
        `Chambers must be labeled CH-1 through CH-4 in ${clinic.name}`
      );
    }
  });

  test('3. Doctor Credential & Differential Fee Schedule Integrity', () => {
    const doctorRegs = new Set<string>();
    const doctorSlugs = new Set<string>();

    for (const clinic of BHOPAL_10_CLINICS) {
      for (const doctor of clinic.doctors) {
        // Unique slug & NMC registration number
        assert.ok(!doctorSlugs.has(doctor.slug), `Doctor slug ${doctor.slug} must be globally unique`);
        doctorSlugs.add(doctor.slug);

        assert.ok(
          !doctorRegs.has(doctor.registrationNumber),
          `Registration ${doctor.registrationNumber} must be unique`
        );
        doctorRegs.add(doctor.registrationNumber);

        // State Medical Council verification
        assert.strictEqual(
          doctor.stateMedicalCouncil,
          'Madhya Pradesh Medical Council',
          'Doctor must be registered with MP Medical Council'
        );

        // Phone number format
        assert.ok(
          /^[6-9]\d{9}$/.test(doctor.mobile),
          `Mobile ${doctor.mobile} must be valid 10-digit Indian number`
        );

        // Fee schedule: follow-up fee must be <= consultation fee
        assert.ok(doctor.consultationFee >= 400, 'Consultation fee must be >= 400');
        assert.ok(
          doctor.followUpFee < doctor.consultationFee,
          'Follow-up fee must be strictly lower than initial consultation fee'
        );

        // Practice sessions: at least 1 weekly session configured
        assert.ok(doctor.sessions.length >= 1, `Doctor ${doctor.fullName} must have configured sessions`);
        for (const session of doctor.sessions) {
          assert.ok(session.slotDurationMinutes >= 10 && session.slotDurationMinutes <= 30);
          assert.ok(session.maxTokens >= 5 && session.maxTokens <= 30);
        }
      }
    }
  });

  test('4. Automated Migration Runner executes and returns verified report', async () => {
    const report = await migrateBhopalPilotDataset();

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalClinics, 10);
    assert.strictEqual(report.totalChambers, 40);
    assert.ok(report.totalDoctors >= 10, 'At least 10 affiliated doctors');
    assert.ok(report.totalSessions >= 20, 'At least 20 weekly consultation sessions');
    assert.strictEqual(report.totalStaff, 11);
    assert.ok(report.durationMs < 100, `Migration benchmark completed in ${report.durationMs.toFixed(2)}ms`);
  });
});
