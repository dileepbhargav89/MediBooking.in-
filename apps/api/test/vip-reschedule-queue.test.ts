/**
 * Phase 22: Automated 14-Day VIP Priority Reschedule Queue Service Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../src/server';
import { appointmentService } from '../src/services/appointment-service';
import { clinicService } from '../src/services/clinic-service';
import { doctorService } from '../src/services/doctor-service';
import { affiliationService } from '../src/services/affiliation-service';
import { authService } from '../src/services/auth-service';
import { sessionService } from '../src/services/session-service';
import { rescheduleQueueService } from '../src/services/reschedule-queue-service';
import { SEED_DATA } from '@medibooking/database';
import {
  UserRole,
  StaffScope,
  AppointmentStatus,
  PaymentStatus,
  TriageSeverity,
} from '@medibooking/types';

describe('Phase 22: Automated 14-Day VIP Priority Reschedule Queue Service', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let receptionistToken: string;
  let dedicatedPatelCompounderToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    sessionService.reset();
    app = createApiServer();

    receptionistToken = authService.signToken({
      sub: 'usr-rec-clinic-wide',
      mobile: '9826011111',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.CLINIC_WIDE,
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

  it('1. Lists eligible VIP priority reschedule candidates with daysRemaining', async () => {
    const today = new Date().toISOString().split('T')[0] as string;
    const futureExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    // Appointment 1: Eligible CANCELLED_CLINIC with 10 days left
    appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Sunil Rathore',
      patientMobile: '9826011221',
      tokenNumber: 5,
      status: AppointmentStatus.CANCELLED_CLINIC,
      cancellationReason: 'Emergency doctor surgery call',
      rescheduleEligibleUntil: futureExpiry,
      paymentStatus: PaymentStatus.PAID_CASH,
      appointmentDate: today,
    });

    // Appointment 2: Ineligible because already completed
    appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Completed Patient',
      patientMobile: '9826011222',
      tokenNumber: 1,
      status: AppointmentStatus.COMPLETED,
      appointmentDate: today,
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/reschedule/eligible`,
      headers: { authorization: `Bearer ${receptionistToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.count, 1);
    assert.equal(body.eligibleAppointments[0].patientName, 'Sunil Rathore');
    assert.ok(body.eligibleAppointments[0].daysRemaining >= 9);
    assert.equal(body.eligibleAppointments[0].originalPaymentStatus, PaymentStatus.PAID_CASH);
  });

  it('2. Claim VIP Priority Reschedule allocates new token, waives fee, and links records', async () => {
    const today = new Date().toISOString().split('T')[0] as string;
    const futureExpiry = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
    const targetDate = '2026-11-10';

    const cancelledAppt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Deepak Joshi',
      patientMobile: '9826011333',
      tokenNumber: 3,
      status: AppointmentStatus.CANCELLED_CLINIC,
      cancellationReason: 'Doctor emergency absence',
      rescheduleEligibleUntil: futureExpiry,
      paymentStatus: PaymentStatus.PAID_UPI_QR,
      receiptNumber: 'MB-REC-ORIG-001',
      appointmentDate: today,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reschedule/claim',
      headers: { authorization: `Bearer ${receptionistToken}` },
      payload: {
        cancelledAppointmentId: cancelledAppt.id,
        targetDate,
        targetChamberNumber: 'CH-1',
        notes: 'Patient requested Tuesday evening slot',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.rescheduledDate, targetDate);
    assert.equal(body.tokenNumber, 1);
    assert.equal(body.feeWaived, true);
    assert.ok(body.message.includes('VIP Priority Reschedule successful'));

    // Check newly created appointment in storage
    const newAppt = await appointmentService.getAppointmentById(body.newAppointment.id);
    assert.ok(newAppt);
    assert.equal(newAppt?.status, AppointmentStatus.SCHEDULED);
    assert.equal(newAppt?.isVipPriorityReschedule, true);
    assert.equal(newAppt?.triageSeverity, TriageSeverity.URGENT_TRIAGE);
    assert.equal(newAppt?.paymentStatus, PaymentStatus.PAID_UPI_QR);
    assert.equal(newAppt?.amountRupees, 0); // zero balance due!
    assert.equal(newAppt?.rescheduledFromAppointmentId, cancelledAppt.id);

    // Check original appointment is linked to new appointment
    const origUpdated = await appointmentService.getAppointmentById(cancelledAppt.id);
    assert.equal(origUpdated?.rescheduledToAppointmentId, newAppt?.id);
  });

  it('3. Replay Protection: Rejects second reschedule claim on same appointment (409 Conflict)', async () => {
    const today = new Date().toISOString().split('T')[0] as string;
    const futureExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const cancelledAppt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Ravi Kumar',
      patientMobile: '9826011444',
      tokenNumber: 4,
      status: AppointmentStatus.CANCELLED_CLINIC,
      cancellationReason: 'Doctor emergency absence',
      rescheduleEligibleUntil: futureExpiry,
      paymentStatus: PaymentStatus.PAID_CASH,
      appointmentDate: today,
    });

    // 1st Claim (succeeds)
    const firstRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reschedule/claim',
      headers: { authorization: `Bearer ${receptionistToken}` },
      payload: {
        cancelledAppointmentId: cancelledAppt.id,
        targetDate: '2026-11-12',
      },
    });
    assert.equal(firstRes.statusCode, 200);

    // 2nd Claim attempt on same cancelled appointment (fails with 409)
    const secondRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reschedule/claim',
      headers: { authorization: `Bearer ${receptionistToken}` },
      payload: {
        cancelledAppointmentId: cancelledAppt.id,
        targetDate: '2026-11-15',
      },
    });
    assert.equal(secondRes.statusCode, 409);
    const body = JSON.parse(secondRes.payload);
    assert.equal(body.error, 'Conflict');
    assert.ok(body.message.includes('already been rescheduled'));
  });

  it('4. Rejects claim when 14-day eligibility window has expired', async () => {
    const pastDate = '2026-10-10';
    // Expired 5 days ago
    const pastExpiry = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const expiredAppt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Late Patient',
      patientMobile: '9826011555',
      tokenNumber: 6,
      status: AppointmentStatus.CANCELLED_CLINIC,
      cancellationReason: 'Doctor absent',
      rescheduleEligibleUntil: pastExpiry,
      appointmentDate: pastDate,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reschedule/claim',
      headers: { authorization: `Bearer ${receptionistToken}` },
      payload: {
        cancelledAppointmentId: expiredAppt.id,
        targetDate: '2026-11-12',
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('expired'));
  });

  it('5. Check eligibility endpoint returns diagnostic report', async () => {
    const today = new Date().toISOString().split('T')[0] as string;
    const futureExpiry = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();

    const appt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Test Check Patient',
      patientMobile: '9826011666',
      tokenNumber: 7,
      status: AppointmentStatus.CANCELLED_CLINIC,
      cancellationReason: 'Session cancelled',
      rescheduleEligibleUntil: futureExpiry,
      appointmentDate: today,
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/reschedule/check/${appt.id}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.isEligible, true);
    assert.equal(body.appointment.id, appt.id);
  });

  it('6. Dedicated compounder cannot claim reschedule for another doctor (403 Forbidden)', async () => {
    const today = new Date().toISOString().split('T')[0] as string;
    const futureExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const sharmaCancelled = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Sharma Patient',
      patientMobile: '9826011777',
      tokenNumber: 8,
      status: AppointmentStatus.CANCELLED_CLINIC,
      rescheduleEligibleUntil: futureExpiry,
      appointmentDate: today,
    });

    // Patel compounder attempts to reschedule Sharma patient
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reschedule/claim',
      headers: { authorization: `Bearer ${dedicatedPatelCompounderToken}` },
      payload: {
        cancelledAppointmentId: sharmaCancelled.id,
        targetDate: '2026-11-14',
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'Forbidden');
    assert.ok(body.message.includes('restricted to doctor'));
  });
});
