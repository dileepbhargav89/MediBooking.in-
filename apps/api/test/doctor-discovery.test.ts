/**
 * MediBooking Enterprise Doctor-First Discovery Test Suite
 * Tests public practitioner discovery (/dr/:slug), multi-venue practice aggregation,
 * differential fee projection, and public doctor directory filtering.
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { createApiServer } from '../src/server';
import { FastifyInstance } from 'fastify';
import { SEED_DATA } from '@medibooking/database';
import { affiliationService } from '../src/services/affiliation-service';
import { clinicService } from '../src/services/clinic-service';
import { doctorService } from '../src/services/doctor-service';
import { sessionService } from '../src/services/session-service';
import { MedicalSpecialty } from '@medibooking/types';

describe('Phase 10: Doctor-First Public Discovery & Multi-Venue Aggregation', () => {
  let app: FastifyInstance;

  before(async () => {
    app = createApiServer();
    await app.ready();
  });

  beforeEach(() => {
    affiliationService.reset();
    doctorService.resetStore();
    clinicService.reset();
    sessionService.reset();
  });

  describe('1. Single-Venue Profile Discovery', () => {
    it('should retrieve doctor profile and consulting venue by slug', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/doctors/dr-rajesh-sharma-cardio',
      });

      assert.strictEqual(res.statusCode, 200);
      const data = JSON.parse(res.body);

      assert.ok(data.doctor);
      assert.strictEqual(data.doctor.fullName, 'Dr. Rajesh Sharma');
      assert.strictEqual(data.doctor.registrationNumber, 'MPMC-48291');

      assert.ok(Array.isArray(data.consultingVenues));
      assert.strictEqual(data.consultingVenues.length, 1);

      const venue = data.consultingVenues[0];
      assert.strictEqual(venue.clinicId, SEED_DATA.clinic.id);
      assert.strictEqual(venue.clinicName, SEED_DATA.clinic.name);
      assert.strictEqual(venue.chamberNumber, 'CH-1');
      assert.strictEqual(venue.consultationFeeRupees, 700);
      assert.strictEqual(venue.followUpFeeRupees, 400);
      assert.strictEqual(venue.followUpValidityDays, 7);
      assert.strictEqual(venue.isPrimaryClinic, true);

      // Verify sessions are attached
      assert.ok(venue.sessions.length >= 3, 'Should have Mon/Wed/Fri sessions');
    });

    it('should return 404 Not Found for non-existent doctor slug', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/doctors/dr-unknown-slug-xyz',
      });

      assert.strictEqual(res.statusCode, 404);
      const data = JSON.parse(res.body);
      assert.strictEqual(data.error, 'Not Found');
    });
  });

  describe('2. Multi-Venue Practice Aggregation', () => {
    it('should dynamically aggregate multiple clinic venues for a doctor', async () => {
      const doc = SEED_DATA.doctors[0]; // Dr. Rajesh Sharma

      // Provision a second clinic in Arera Colony
      const secondClinic = await clinicService.createClinic({
        name: 'Arera Heart & Diagnostic Institute',
        addressLine: 'E-3/42 Arera Colony',
        locality: 'Arera Colony',
        city: 'Bhopal',
        pincode: '462016',
        contactPhone: '9826055555',
        initialChambersCount: 2,
      });

      // Affiliate Dr. Rajesh Sharma to second clinic with differential fees
      await affiliationService.affiliateDoctor({
        clinicId: secondClinic.clinic.id,
        doctorId: doc.doctorId,
        chamberNumber: 'CH-2',
        consultationFeeRupees: 1200,
        followUpFeeRupees: 600,
        followUpValidityDays: 10,
        isPrimaryClinic: false,
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/${doc.slug}`,
      });

      assert.strictEqual(res.statusCode, 200);
      const data = JSON.parse(res.body);

      assert.strictEqual(data.consultingVenues.length, 2, 'Doctor should now show 2 consulting venues');

      const primaryVenue = data.consultingVenues.find((v: any) => v.clinicId === SEED_DATA.clinic.id);
      const secondaryVenue = data.consultingVenues.find((v: any) => v.clinicId === secondClinic.clinic.id);

      assert.ok(primaryVenue);
      assert.strictEqual(primaryVenue.consultationFeeRupees, 700);
      assert.strictEqual(primaryVenue.isPrimaryClinic, true);

      assert.ok(secondaryVenue);
      assert.strictEqual(secondaryVenue.clinicName, 'Arera Heart & Diagnostic Institute');
      assert.strictEqual(secondaryVenue.consultationFeeRupees, 1200);
      assert.strictEqual(secondaryVenue.followUpFeeRupees, 600);
      assert.strictEqual(secondaryVenue.isPrimaryClinic, false);
    });
  });

  describe('3. Public Doctor Directory Search', () => {
    it('should list all doctors with their primary venue summary', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/doctors',
      });

      assert.strictEqual(res.statusCode, 200);
      const data = JSON.parse(res.body);

      assert.ok(data.success);
      assert.strictEqual(data.count, 4, 'Should return 4 seeded doctors');
      assert.ok(data.doctors[0].primaryVenue);
      assert.strictEqual(data.doctors[0].primaryVenue.chamberNumber, 'CH-1');
    });

    it('should filter doctors by specialty', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors?specialty=${MedicalSpecialty.DERMATOLOGY}`,
      });

      assert.strictEqual(res.statusCode, 200);
      const data = JSON.parse(res.body);

      assert.strictEqual(data.count, 1);
      assert.strictEqual(data.doctors[0].fullName, 'Dr. Priya Verma');
    });

    it('should filter doctors by text search query', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/doctors?query=AIIMS',
      });

      assert.strictEqual(res.statusCode, 200);
      const data = JSON.parse(res.body);

      assert.ok(data.count >= 1);
      assert.strictEqual(data.doctors[0].fullName, 'Dr. Rajesh Sharma');
    });
  });

  describe('4. Regulatory Verification Status Badge', () => {
    it('should return public verification badge', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/public/doctors/dr-rajesh-sharma-cardio/verify-status',
      });

      assert.strictEqual(res.statusCode, 200);
      const data = JSON.parse(res.body);

      assert.strictEqual(data.isVerified, true);
      assert.strictEqual(data.verificationBadge, 'NMC_VERIFIED_PRACTITIONER');
      assert.strictEqual(data.stateMedicalCouncil, 'Madhya Pradesh Medical Council');
    });
  });
});

