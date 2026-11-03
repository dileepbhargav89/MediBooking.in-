/**
 * MediBooking Enterprise Clinic-Doctor Affiliation Test Suite
 * Tests multi-clinic doctor affiliation, chamber assignments,
 * differential venue-specific fee matrices, and primary clinic rules.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { AffiliationService } from '../src/services/affiliation-service';
import { SEED_DATA } from '@medibooking/database';

describe('Phase 6: Clinic-Doctor Affiliation & Differential Fee Matrix', () => {
  let service: AffiliationService;

  beforeEach(() => {
    service = new AffiliationService();
  });

  describe('1. Default Seed Affiliations', () => {
    it('should pre-populate default Bhopal polyclinic doctor affiliations', async () => {
      const affiliations = await service.getAffiliationsByClinic(SEED_DATA.clinic.id);
      assert.strictEqual(affiliations.length, 4, 'Should have 4 seeded doctor affiliations');

      const cardioDoc = affiliations.find((a) => a.chamberNumber === 'CH-1');
      assert.ok(cardioDoc, 'Should find CH-1 cardiologist affiliation');
      assert.strictEqual(cardioDoc.consultationFeeRupees, 700);
      assert.strictEqual(cardioDoc.followUpFeeRupees, 400);
      assert.strictEqual(cardioDoc.followUpValidityDays, 7);
      assert.strictEqual(cardioDoc.isActive, true);
    });

    it('should retrieve single affiliation by clinicId and doctorId', async () => {
      const doc = SEED_DATA.doctors[0];
      const aff = await service.getAffiliation(SEED_DATA.clinic.id, doc.doctorId);

      assert.ok(aff);
      assert.strictEqual(aff.doctorId, doc.doctorId);
      assert.strictEqual(aff.clinicId, SEED_DATA.clinic.id);
      assert.strictEqual(aff.chamberNumber, 'CH-1');
    });
  });

  describe('2. Affiliation Creation & Uniqueness', () => {
    it('should successfully affiliate a new doctor to a clinic', async () => {
      const clinicId = crypto.randomUUID();
      const doctorId = crypto.randomUUID();

      const aff = await service.affiliateDoctor({
        clinicId,
        doctorId,
        chamberNumber: 'CH-A',
        consultationFeeRupees: 600,
        followUpFeeRupees: 350,
        followUpValidityDays: 10,
        isPrimaryClinic: true,
      });

      assert.ok(aff.id);
      assert.strictEqual(aff.clinicId, clinicId);
      assert.strictEqual(aff.doctorId, doctorId);
      assert.strictEqual(aff.chamberNumber, 'CH-A');
      assert.strictEqual(aff.consultationFeeRupees, 600);
      assert.strictEqual(aff.followUpFeeRupees, 350);
      assert.strictEqual(aff.followUpValidityDays, 10);
      assert.strictEqual(aff.isPrimaryClinic, true);
      assert.strictEqual(aff.isActive, true);
    });

    it('should reject duplicate active affiliation for same clinic and doctor', async () => {
      const doc = SEED_DATA.doctors[0];

      await assert.rejects(
        async () => {
          await service.affiliateDoctor({
            clinicId: SEED_DATA.clinic.id,
            doctorId: doc.doctorId,
            chamberNumber: 'CH-1',
          });
        },
        {
          name: 'Error',
          message: 'Doctor is already affiliated with this clinic',
        }
      );
    });

    it('should apply default fee values when omitted', async () => {
      const clinicId = crypto.randomUUID();
      const doctorId = crypto.randomUUID();

      const aff = await service.affiliateDoctor({
        clinicId,
        doctorId,
        chamberNumber: 'ROOM-10',
      });

      assert.strictEqual(aff.consultationFeeRupees, 500);
      assert.strictEqual(aff.followUpFeeRupees, 300);
      assert.strictEqual(aff.followUpValidityDays, 7);
      assert.strictEqual(aff.isPrimaryClinic, false);
    });

    it('should reject negative consultation fees', async () => {
      await assert.rejects(
        async () => {
          await service.affiliateDoctor({
            clinicId: crypto.randomUUID(),
            doctorId: crypto.randomUUID(),
            chamberNumber: 'CH-1',
            consultationFeeRupees: -100,
          });
        },
        {
          message: 'Consultation fee must be non-negative',
        }
      );
    });

    it('should reject negative follow-up fees', async () => {
      await assert.rejects(
        async () => {
          await service.affiliateDoctor({
            clinicId: crypto.randomUUID(),
            doctorId: crypto.randomUUID(),
            chamberNumber: 'CH-1',
            followUpFeeRupees: -50,
          });
        },
        {
          message: 'Follow-up fee must be non-negative',
        }
      );
    });

    it('should reject negative follow-up validity days', async () => {
      await assert.rejects(
        async () => {
          await service.affiliateDoctor({
            clinicId: crypto.randomUUID(),
            doctorId: crypto.randomUUID(),
            chamberNumber: 'CH-1',
            followUpValidityDays: -1,
          });
        },
        {
          message: 'Follow-up validity days must be non-negative',
        }
      );
    });
  });

  describe('3. Differential Fee Matrix Updates & Chamber Reassignment', () => {
    it('should update differential consultation and follow-up fees', async () => {
      const doc = SEED_DATA.doctors[0];
      const updated = await service.updateAffiliation(SEED_DATA.clinic.id, doc.doctorId, {
        consultationFeeRupees: 900,
        followUpFeeRupees: 500,
        followUpValidityDays: 14,
      });

      assert.strictEqual(updated.consultationFeeRupees, 900);
      assert.strictEqual(updated.followUpFeeRupees, 500);
      assert.strictEqual(updated.followUpValidityDays, 14);
    });

    it('should reassign chamber for an affiliated doctor', async () => {
      const doc = SEED_DATA.doctors[0];
      const newChamberId = crypto.randomUUID();

      const updated = await service.updateAffiliation(SEED_DATA.clinic.id, doc.doctorId, {
        chamberId: newChamberId,
        chamberNumber: 'CH-5',
      });

      assert.strictEqual(updated.chamberId, newChamberId);
      assert.strictEqual(updated.chamberNumber, 'CH-5');
    });

    it('should reject negative fee updates', async () => {
      const doc = SEED_DATA.doctors[0];
      await assert.rejects(
        async () => {
          await service.updateAffiliation(SEED_DATA.clinic.id, doc.doctorId, {
            consultationFeeRupees: -200,
          });
        },
        {
          message: 'Consultation fee must be non-negative',
        }
      );
    });

    it('should throw error when updating a non-existent affiliation', async () => {
      await assert.rejects(
        async () => {
          await service.updateAffiliation(crypto.randomUUID(), crypto.randomUUID(), {
            consultationFeeRupees: 800,
          });
        },
        {
          name: 'Error',
        }
      );
    });
  });

  describe('4. Multi-Clinic Practice & Primary Clinic Switching', () => {
    it('should allow a doctor to practice across multiple clinics with differential fees', async () => {
      const doctorId = crypto.randomUUID();
      const clinicA = crypto.randomUUID();
      const clinicB = crypto.randomUUID();

      // Practice at Clinic A: Arera Colony (Evening) - ₹600
      await service.affiliateDoctor({
        clinicId: clinicA,
        doctorId,
        chamberNumber: 'CH-1',
        consultationFeeRupees: 600,
        followUpFeeRupees: 300,
        isPrimaryClinic: true,
      });

      // Practice at Clinic B: MP Nagar (Morning) - ₹1000
      await service.affiliateDoctor({
        clinicId: clinicB,
        doctorId,
        chamberNumber: 'CH-3',
        consultationFeeRupees: 1000,
        followUpFeeRupees: 500,
        isPrimaryClinic: false,
      });

      const doctorVenues = await service.getAffiliationsByDoctor(doctorId);
      assert.strictEqual(doctorVenues.length, 2, 'Doctor should have 2 active clinic venues');

      const venueA = doctorVenues.find((v) => v.clinicId === clinicA);
      const venueB = doctorVenues.find((v) => v.clinicId === clinicB);

      assert.strictEqual(venueA?.consultationFeeRupees, 600);
      assert.strictEqual(venueA?.isPrimaryClinic, true);

      assert.strictEqual(venueB?.consultationFeeRupees, 1000);
      assert.strictEqual(venueB?.isPrimaryClinic, false);
    });

    it('should unset previous primary clinic when a new clinic is designated primary', async () => {
      const doctorId = crypto.randomUUID();
      const clinicA = crypto.randomUUID();
      const clinicB = crypto.randomUUID();

      await service.affiliateDoctor({
        clinicId: clinicA,
        doctorId,
        chamberNumber: 'CH-1',
        isPrimaryClinic: true,
      });

      // Now set Clinic B as primary
      await service.affiliateDoctor({
        clinicId: clinicB,
        doctorId,
        chamberNumber: 'CH-2',
        isPrimaryClinic: true,
      });

      const affA = await service.getAffiliation(clinicA, doctorId);
      const affB = await service.getAffiliation(clinicB, doctorId);

      assert.strictEqual(affA?.isPrimaryClinic, false, 'Clinic A primary flag should be reset to false');
      assert.strictEqual(affB?.isPrimaryClinic, true, 'Clinic B primary flag should be true');
    });
  });

  describe('5. Deactivation, Removal and Re-Activation', () => {
    it('should deactivate an affiliation when doctor departs or takes sabbatical', async () => {
      const doc = SEED_DATA.doctors[0];
      const deactivated = await service.deactivateAffiliation(SEED_DATA.clinic.id, doc.doctorId);

      assert.strictEqual(deactivated.isActive, false);

      const activeList = await service.getAffiliationsByClinic(SEED_DATA.clinic.id, true);
      assert.strictEqual(activeList.length, 3, 'Active list should now only contain 3 doctors');

      const allList = await service.getAffiliationsByClinic(SEED_DATA.clinic.id, false);
      assert.strictEqual(allList.length, 4, 'Full list should still contain 4 doctors');
    });

    it('should reactivate previously inactive affiliation when re-affiliated', async () => {
      const doc = SEED_DATA.doctors[0];
      await service.deactivateAffiliation(SEED_DATA.clinic.id, doc.doctorId);

      const reactivated = await service.affiliateDoctor({
        clinicId: SEED_DATA.clinic.id,
        doctorId: doc.doctorId,
        chamberNumber: 'CH-1',
        consultationFeeRupees: 800,
      });

      assert.strictEqual(reactivated.isActive, true);
      assert.strictEqual(reactivated.consultationFeeRupees, 800);
    });

    it('should hard remove an affiliation', async () => {
      const doc = SEED_DATA.doctors[0];
      const deleted = await service.removeAffiliation(SEED_DATA.clinic.id, doc.doctorId);

      assert.strictEqual(deleted, true);

      const found = await service.getAffiliation(SEED_DATA.clinic.id, doc.doctorId);
      assert.strictEqual(found, null);
    });
  });
});

