/**
 * Phase 21: Doctor Emergency Session Cancellation & Slot Invalidation Engine Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../src/server';
import { appointmentService } from '../src/services/appointment-service';
import { slotService } from '../src/services/slot-service';
import { clinicService } from '../src/services/clinic-service';
import { doctorService } from '../src/services/doctor-service';
import { affiliationService } from '../src/services/affiliation-service';
import { authService } from '../src/services/auth-service';
import { sessionService } from '../src/services/session-service';
import { sessionCancellationEngine } from '../src/services/session-cancellation-engine';
import { SEED_DATA } from '@medibooking/database';
import {
  UserRole,
  StaffScope,
  SlotStatus,
  AppointmentStatus,
  TriageSeverity,
  PaymentStatus,
} from '@medibooking/types';

describe('Phase 21: Doctor Emergency Session Cancellation & Slot Invalidation Engine', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let doctorSharmaToken: string;
  let receptionistToken: string;
  let dedicatedPatelCompounderToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    slotService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    sessionService.reset();
    sessionCancellationEngine.reset();
    app = createApiServer();

    doctorSharmaToken = authService.signToken({
      sub: doctorSharma.userId,
      mobile: doctorSharma.mobile,
      role: UserRole.DOCTOR,
      clinicId: testClinicId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

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

  it('1. Emergency session cancellation transitions active appointments to CANCELLED_CLINIC & invalidates slots', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    // Register 2 slots for Dr. Sharma
    slotService.registerSlot({
      id: 'slot-cancel-1',
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      sessionId: 'sess-01',
      chamberNumber: 'CH-1',
      slotDate: today,
      startTime: `${today}T18:00:00+05:30`,
      endTime: `${today}T18:15:00+05:30`,
      status: SlotStatus.AVAILABLE,
    });
    slotService.registerSlot({
      id: 'slot-cancel-2',
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      sessionId: 'sess-01',
      chamberNumber: 'CH-1',
      slotDate: today,
      startTime: `${today}T18:15:00+05:30`,
      endTime: `${today}T18:30:00+05:30`,
      status: SlotStatus.AVAILABLE,
    });

    // Active appointment 1: WAITING
    const appt1 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Ramesh Verma',
      patientMobile: '9826012391',
      tokenNumber: 1,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    // Active appointment 2: SCHEDULED
    const appt2 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Suresh Patel',
      patientMobile: '9826012392',
      tokenNumber: 2,
      status: AppointmentStatus.SCHEDULED,
      appointmentDate: today,
    });

    // Completed appointment 3: COMPLETED earlier (must remain untouched)
    const appt3 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Pre-consulted Patient',
      patientMobile: '9826012393',
      tokenNumber: 0,
      status: AppointmentStatus.COMPLETED,
      appointmentDate: today,
    });

    // Trigger Emergency Session Cancellation
    const cancelRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sessions/emergency-cancel',
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        date: today,
        cancellationReason: 'Emergency angioplasty surgery call at AIIMS Bhopal',
        rescheduleWindowDays: 14,
      },
    });

    assert.equal(cancelRes.statusCode, 200);
    const cancelBody = JSON.parse(cancelRes.payload);
    assert.equal(cancelBody.success, true);
    assert.equal(cancelBody.cancelledAppointmentsCount, 2);
    assert.equal(cancelBody.invalidatedSlotsCount, 2);
    assert.ok(cancelBody.message.includes('Emergency session cancellation executed'));

    // Verify Active Appointments are CANCELLED_CLINIC with reason and reschedule date
    const updatedAppt1 = await appointmentService.getAppointmentById(appt1.id);
    assert.equal(updatedAppt1?.status, AppointmentStatus.CANCELLED_CLINIC);
    assert.ok(updatedAppt1?.cancellationReason?.includes('AIIMS Bhopal'));
    assert.ok(updatedAppt1?.rescheduleEligibleUntil);

    const updatedAppt2 = await appointmentService.getAppointmentById(appt2.id);
    assert.equal(updatedAppt2?.status, AppointmentStatus.CANCELLED_CLINIC);

    // Verify Completed Appointment remains COMPLETED!
    const updatedAppt3 = await appointmentService.getAppointmentById(appt3.id);
    assert.equal(updatedAppt3?.status, AppointmentStatus.COMPLETED);

    // Verify Slots are CANCELLED
    const updatedSlot1 = await slotService.getSlotById('slot-cancel-1');
    assert.equal(updatedSlot1?.status, SlotStatus.CANCELLED);
    const updatedSlot2 = await slotService.getSlotById('slot-cancel-2');
    assert.equal(updatedSlot2?.status, SlotStatus.CANCELLED);
  });

  it('2. Waiting Room TV state dynamically displays emergency cancellation banner', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    await app.inject({
      method: 'POST',
      url: '/api/v1/sessions/emergency-cancel',
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        date: today,
        cancellationReason: 'Sudden high fever and illness',
      },
    });

    // Check Waiting Room TV Snapshot
    const tvRes = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/clinics/${testClinicId}/snapshot`,
    });
    assert.equal(tvRes.statusCode, 200);
    const tvBody = JSON.parse(tvRes.payload);
    const ch1 = tvBody.chambers.find((c: any) => c.chamberNumber === 'CH-1');
    assert.ok(ch1);
    assert.equal(ch1.currentToken, null);
    assert.equal(ch1.delayMinutes, 0);
    assert.ok(ch1.statusMessage.includes('SESSION CANCELLED'));
    assert.ok(ch1.statusMessage.includes('Sudden high fever'));
  });

  it('3. Cancellation status and history endpoints report accurate records', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    // Trigger cancellation
    await app.inject({
      method: 'POST',
      url: '/api/v1/sessions/emergency-cancel',
      headers: { authorization: `Bearer ${receptionistToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        date: today,
        cancellationReason: 'Doctor attending regional medical conference in Indore',
      },
    });

    // Query cancellation status
    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/v1/sessions/cancellation-status?clinicId=${testClinicId}&doctorId=${doctorSharma.doctorId}&date=${today}`,
      headers: { authorization: `Bearer ${receptionistToken}` },
    });
    assert.equal(statusRes.statusCode, 200);
    const statusBody = JSON.parse(statusRes.payload);
    assert.equal(statusBody.isCancelled, true);
    assert.ok(statusBody.record);
    assert.ok(statusBody.record.cancellationReason.includes('Indore'));

    // Query cancellation history
    const historyRes = await app.inject({
      method: 'GET',
      url: `/api/v1/sessions/cancellations?doctorId=${doctorSharma.doctorId}`,
      headers: { authorization: `Bearer ${receptionistToken}` },
    });
    assert.equal(historyRes.statusCode, 200);
    const historyBody = JSON.parse(historyRes.payload);
    assert.equal(historyBody.count, 1);
    assert.equal(historyBody.history[0].sessionDate, today);
  });

  it('4. Dedicated compounder cannot cancel sessions for another doctor (403 Forbidden)', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    // Dedicated Patel compounder attempts to cancel Dr. Sharma's session
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sessions/emergency-cancel',
      headers: { authorization: `Bearer ${dedicatedPatelCompounderToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        date: today,
        cancellationReason: 'Unauthorized cancellation attempt',
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'Forbidden');
    assert.ok(body.message.includes('restricted to doctor'));
  });

  it('5. Rejects session cancellation with short reason with 400 Validation Error', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sessions/emergency-cancel',
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        date: today,
        cancellationReason: 'Sick', // less than 5 characters!
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'Validation Error');
  });
});
