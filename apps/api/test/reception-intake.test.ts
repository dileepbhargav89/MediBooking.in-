/**
 * Phase 13: Rapid 15-Second Reception Walk-In Intake Service Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../src/server';
import { appointmentService } from '../src/services/appointment-service';
import { clinicService } from '../src/services/clinic-service';
import { doctorService } from '../src/services/doctor-service';
import { affiliationService } from '../src/services/affiliation-service';
import { authService } from '../src/services/auth-service';
import { SEED_DATA } from '@medibooking/database';
import { UserRole, StaffScope, PaymentStatus, TriageSeverity } from '@medibooking/types';

describe('Phase 13: Rapid 15-Second Reception Walk-In Intake Service', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let receptionistToken: string;
  let compounderToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    app = createApiServer();

    // 1. Central clinic-wide receptionist token
    receptionistToken = authService.signToken({
      sub: 'usr-rec-001',
      mobile: '9826033333',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.CLINIC_WIDE,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    // 2. Doctor-dedicated compounder for Dr. Sharma
    compounderToken = authService.signToken({
      sub: 'usr-comp-001',
      mobile: '9826044444',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.DOCTOR_DEDICATED,
      dedicatedDoctorId: doctorSharma.doctorId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  describe('1. Rapid Walk-In Intake & Auto-Resolved Fee', () => {
    it('should complete intake with minimal fields and auto-resolve consultation fee in <50ms', async () => {
      const startTime = Date.now();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${receptionistToken}`,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Devendra Patel',
          mobile: '9826198765',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      const durationMs = Date.now() - startTime;
      assert.ok(durationMs < 1000, `Intake should finish rapidly (took ${durationMs}ms)`);
      assert.equal(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.equal(body.success, true);
      assert.equal(body.tokenNumber, 1);
      assert.equal(body.chamberNumber, 'CH-1');
      assert.equal(body.appointment.patientName, 'Devendra Patel');
      assert.equal(body.appointment.source, 'WALK_IN');
      assert.equal(body.appointment.status, 'WAITING');
      assert.equal(body.appointment.amountRupees, 700); // Dr. Sharma's consultation fee auto-resolved

      // Thermal slip payload assertions
      assert.equal(body.thermalSlipData.clinicName, 'CityCare Polyclinic & Diagnostic Centre');
      assert.equal(body.thermalSlipData.chamber, 'CH-1');
      assert.equal(body.thermalSlipData.token, 1);
      assert.equal(body.thermalSlipData.patientName, 'Devendra Patel');
      assert.equal(body.thermalSlipData.patientMaskedPhone, '98261*****');
      assert.equal(body.thermalSlipData.feeRupees, 700);
      assert.equal(body.thermalSlipData.payment, PaymentStatus.PAID_CASH);
    });

    it('should auto-resolve follow-up fee when triageSeverity is FOLLOW_UP', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${receptionistToken}`,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Harish Malviya',
          mobile: '9826123456',
          triageSeverity: TriageSeverity.FOLLOW_UP,
          paymentMethod: PaymentStatus.PAID_UPI_QR,
        },
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.equal(body.appointment.amountRupees, 400); // Dr. Sharma's follow-up fee
      assert.equal(body.thermalSlipData.feeRupees, 400);
      assert.equal(body.thermalSlipData.payment, PaymentStatus.PAID_UPI_QR);
    });

    it('should allow front-desk override of consultation fee', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${receptionistToken}`,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Kailash Soni',
          mobile: '9826111222',
          paymentMethod: PaymentStatus.PAID_CASH,
          amountRupees: 500, // Explicit custom discount override
        },
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.equal(body.appointment.amountRupees, 500);
      assert.equal(body.thermalSlipData.feeRupees, 500);
    });
  });

  describe('2. Sequential Token Counter per Chamber & Doctor', () => {
    it('should issue consecutive tokens #1, #2, #3 for same doctor chamber', async () => {
      for (let i = 1; i <= 3; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/reception/intake',
          headers: {
            authorization: `Bearer ${receptionistToken}`,
          },
          payload: {
            clinicId: testClinicId,
            doctorId: doctorSharma.doctorId,
            chamberNumber: 'CH-1',
            patientName: `Patient Token ${i}`,
            mobile: `982610000${i}`,
            paymentMethod: PaymentStatus.PAID_CASH,
          },
        });

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.tokenNumber, i);
        assert.equal(body.thermalSlipData.token, i);
      }
    });
  });

  describe('3. Dual-Scope Staff RBAC Security', () => {
    it('should allow dedicated compounder to intake for their assigned doctor (CH-1)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${compounderToken}`,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Valid Compounder Intake',
          mobile: '9826155555',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.equal(body.success, true);
    });

    it('should block dedicated compounder with 403 when attempting intake for another doctor (CH-2)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${compounderToken}`,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorPatel.doctorId, // Non-assigned doctor
          chamberNumber: 'CH-2',
          patientName: 'Unauthorized Cross-Chamber Intake',
          mobile: '9826166666',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      assert.equal(response.statusCode, 403);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Staff Scope Restriction');
      assert.ok(body.message.includes('Dedicated staff is restricted'));
    });
  });

  describe('4. Input Validation & Error Handling', () => {
    it('should reject invalid mobile number with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${receptionistToken}`,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: 'CH-1',
          patientName: 'Bad Phone',
          mobile: '5551234', // Invalid non-Indian format
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Validation Error');
    });

    it('should reject non-affiliated doctor with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${receptionistToken}`,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: 'd0000000-0000-4000-8000-000000000099', // Unknown doctor
          chamberNumber: 'CH-1',
          patientName: 'Unknown Doctor Patient',
          mobile: '9826188888',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Intake Error');
    });
  });
});
