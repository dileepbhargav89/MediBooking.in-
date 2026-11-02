/**
 * Phase 15: Direct Clinic Cashiering & Ledger Service Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../src/server';
import { appointmentService } from '../src/services/appointment-service';
import { cashieringService } from '../src/services/cashiering-service';
import { clinicService } from '../src/services/clinic-service';
import { doctorService } from '../src/services/doctor-service';
import { affiliationService } from '../src/services/affiliation-service';
import { authService } from '../src/services/auth-service';
import { SEED_DATA } from '@medibooking/database';
import { UserRole, StaffScope, PaymentStatus, TriageSeverity } from '@medibooking/types';

describe('Phase 15: Direct Clinic Cashiering & Ledger Service', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let centralReceptionistToken: string;
  let dedicatedSharmaCompounderToken: string;
  let dedicatedPatelCompounderToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    cashieringService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    app = createApiServer();

    centralReceptionistToken = authService.signToken({
      sub: 'usr-rec-clinic-wide',
      mobile: '9826011111',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.CLINIC_WIDE,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    dedicatedSharmaCompounderToken = authService.signToken({
      sub: 'usr-comp-sharma',
      mobile: '9826022222',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.DOCTOR_DEDICATED,
      dedicatedDoctorId: doctorSharma.doctorId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    dedicatedPatelCompounderToken = authService.signToken({
      sub: 'usr-comp-patel',
      mobile: '9826033333',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.DOCTOR_DEDICATED,
      dedicatedDoctorId: doctorPatel.doctorId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  describe('1. Cash & UPI Cashiering Flow', () => {
    it('should settle pending appointment with CASH and record ledger entry', async () => {
      // 1. Create intake with PENDING_AT_DESK
      const intakeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Sunil Verma',
          mobile: '9826144444',
          ageYears: 42,
          gender: 'MALE',
          paymentMethod: PaymentStatus.PENDING_AT_DESK,
        },
      });

      assert.equal(intakeRes.statusCode, 200);
      const appt = JSON.parse(intakeRes.body).appointment;
      assert.equal(appt.paymentStatus, PaymentStatus.PENDING_AT_DESK);

      // 2. Settle payment via CASH
      const payRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cashiering/pay',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          appointmentId: appt.id,
          paymentMethod: PaymentStatus.PAID_CASH,
          notes: 'Received exact cash ?700 at counter',
        },
      });

      assert.equal(payRes.statusCode, 200);
      const payData = JSON.parse(payRes.body);
      assert.equal(payData.appointment.paymentStatus, PaymentStatus.PAID_CASH);
      assert.equal(payData.ledgerEntry.paymentMethod, PaymentStatus.PAID_CASH);
      assert.equal(payData.ledgerEntry.amountRupees, 700);
      assert.ok(payData.receipt.receiptNumber);
      assert.equal(payData.receipt.amountRupees, 700);
    });

    it('should settle pending appointment with UPI Soundbox QR and record ledger entry', async () => {
      const intakeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Meena Saxena',
          mobile: '9826155555',
          paymentMethod: PaymentStatus.PENDING_AT_DESK,
        },
      });

      const appt = JSON.parse(intakeRes.body).appointment;

      // Settle via UPI
      const payRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cashiering/pay',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          appointmentId: appt.id,
          paymentMethod: PaymentStatus.PAID_UPI_QR,
          notes: 'Soundbox audio confirmation: Received ?700',
        },
      });

      assert.equal(payRes.statusCode, 200);
      const payData = JSON.parse(payRes.body);
      assert.equal(payData.appointment.paymentStatus, PaymentStatus.PAID_UPI_QR);
      assert.equal(payData.ledgerEntry.paymentMethod, PaymentStatus.PAID_UPI_QR);
    });
  });

  describe('2. Doctor Fee Waiver Handling', () => {
    it('should allow waiving consultation fee and record zero or nominal fee ledger', async () => {
      const intakeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Ramu Kori',
          mobile: '9826166666',
          paymentMethod: PaymentStatus.PENDING_AT_DESK,
        },
      });

      const appt = JSON.parse(intakeRes.body).appointment;

      const payRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cashiering/pay',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          appointmentId: appt.id,
          paymentMethod: PaymentStatus.WAIVED_BY_DOCTOR,
          amountRupees: 0,
          notes: 'Doctor waived fee on humanitarian grounds',
        },
      });

      assert.equal(payRes.statusCode, 200);
      const payData = JSON.parse(payRes.body);
      assert.equal(payData.appointment.paymentStatus, PaymentStatus.WAIVED_BY_DOCTOR);
      assert.equal(payData.appointment.amountRupees, 0);
      assert.equal(payData.ledgerEntry.paymentMethod, PaymentStatus.WAIVED_BY_DOCTOR);
      assert.equal(payData.ledgerEntry.amountRupees, 0);
    });
  });

  describe('3. Duplicate Settlement Guard', () => {
    it('should reject payment settlement on an already settled appointment', async () => {
      // 1. Walk-in paid CASH upfront
      const intakeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Priya Tiwari',
          mobile: '9826177777',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      const appt = JSON.parse(intakeRes.body).appointment;

      // 2. Attempt to pay again
      const payRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cashiering/pay',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          appointmentId: appt.id,
          paymentMethod: PaymentStatus.PAID_UPI_QR,
        },
      });

      assert.equal(payRes.statusCode, 409);
      const err = JSON.parse(payRes.body);
      assert.ok(err.message.includes('PAYMENT_ALREADY_SETTLED'));
    });
  });

  describe('4. Staff Scope RBAC Enforcement', () => {
    it('should prevent doctor-dedicated attendant from cashiering other chambers', async () => {
      // Create intake for Dr. Patel (CH-2)
      const intakeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorPatel.doctorId,
          chamberNumber: doctorPatel.chamberNumber,
          patientName: 'Anita Gupta',
          mobile: '9826188888',
          paymentMethod: PaymentStatus.PENDING_AT_DESK,
        },
      });

      const appt = JSON.parse(intakeRes.body).appointment;

      // Dr. Sharma compounder tries to cashier Dr. Patel's appointment
      const payRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cashiering/pay',
        headers: {
          authorization: `Bearer ${dedicatedSharmaCompounderToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          appointmentId: appt.id,
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      assert.equal(payRes.statusCode, 403);
      assert.ok(JSON.parse(payRes.body).message.includes('Staff scope restricted'));

      // Dr. Patel compounder can successfully cashier
      const payRes2 = await app.inject({
        method: 'POST',
        url: '/api/v1/cashiering/pay',
        headers: {
          authorization: `Bearer ${dedicatedPatelCompounderToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          appointmentId: appt.id,
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      assert.equal(payRes2.statusCode, 200);
    });
  });

  describe('5. Ledger Querying & Daily Cash Drawer Reconciliation', () => {
    it('should aggregate daily cash drawer collections and breakdown by doctor', async () => {
      const today = new Date().toISOString().split('T')[0]!;

      // 1. Dr. Sharma: 1 Cash (?700), 1 UPI (?700), 1 Waived (?0)
      const appt1 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Patient Sharma 1',
          mobile: '9826100001',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      const appt2 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Patient Sharma 2',
          mobile: '9826100002',
          paymentMethod: PaymentStatus.PAID_UPI_QR,
        },
      });

      const appt3 = await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          chamberNumber: doctorSharma.chamberNumber,
          patientName: 'Patient Sharma 3',
          mobile: '9826100003',
          paymentMethod: PaymentStatus.PENDING_AT_DESK,
        },
      });
      const appt3Data = JSON.parse(appt3.body).appointment;
      await app.inject({
        method: 'POST',
        url: '/api/v1/cashiering/pay',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          appointmentId: appt3Data.id,
          paymentMethod: PaymentStatus.WAIVED_BY_DOCTOR,
          amountRupees: 0,
        },
      });

      // 2. Dr. Patel: 1 Cash (?500) and 1 Pending (?500)
      await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorPatel.doctorId,
          chamberNumber: doctorPatel.chamberNumber,
          patientName: 'Patient Patel 1',
          mobile: '9826100004',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/reception/intake',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorPatel.doctorId,
          chamberNumber: doctorPatel.chamberNumber,
          patientName: 'Patient Patel 2',
          mobile: '9826100005',
          paymentMethod: PaymentStatus.PENDING_AT_DESK,
        },
      });

      // 3. Query Cash Drawer Summary
      const summaryRes = await app.inject({
        method: 'GET',
        url: `/api/v1/cashiering/summary?date=${today}`,
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(summaryRes.statusCode, 200);
      const { summary } = JSON.parse(summaryRes.body);

      // Calculations:
      // Cash: 700 (Sharma) + 500 (Patel) = 1200
      // UPI: 700 (Sharma) = 700
      // Waived: 0 (Sharma) = 0
      // Total collected = 1900
      // Pending count = 1 (Patel 2), amount = 500
      assert.equal(summary.cashTotalRupees, 1200);
      assert.equal(summary.upiTotalRupees, 700);
      assert.equal(summary.totalCollectedRupees, 1900);
      assert.equal(summary.waivedTotalRupees, 0);
      assert.equal(summary.waivedTransactionsCount, 1);
      assert.equal(summary.cashTransactionsCount, 2);
      assert.equal(summary.upiTransactionsCount, 1);
      assert.equal(summary.pendingCount, 1);
      assert.equal(summary.pendingAmountRupees, 500);

      assert.equal(summary.breakdownByDoctor.length, 2);

      // 4. Query Ledger with Filter
      const ledgerRes = await app.inject({
        method: 'GET',
        url: `/api/v1/cashiering/ledger?date=${today}&doctorId=${doctorSharma.doctorId}`,
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(ledgerRes.statusCode, 200);
      const ledgerData = JSON.parse(ledgerRes.body);
      assert.equal(ledgerData.count, 3); // 3 entries for Dr. Sharma
      assert.ok(ledgerData.entries.every((e: any) => e.doctorId === doctorSharma.doctorId));
    });
  });
});
