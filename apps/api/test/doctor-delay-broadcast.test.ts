/**
 * Phase 20: 1-Click Doctor Delay Broadcast Engine & Downstream ETA Recalculation Tests
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
import { delayBroadcastEngine } from '../src/services/delay-broadcast-engine';
import { SEED_DATA } from '@medibooking/database';
import { UserRole, StaffScope, PaymentStatus, TriageSeverity, AppointmentStatus } from '@medibooking/types';

describe('Phase 20: 1-Click Doctor Delay Broadcast Engine', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let doctorSharmaToken: string;
  let receptionistToken: string;
  let dedicatedPatelCompounderToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    sessionService.reset();
    delayBroadcastEngine.reset();
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

  it('1. 1-Click delay broadcast (+30 mins) shifts downstream ETAs for waiting appointments', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    // Appointment 1: Waiting, base ETA 18:00
    const appt1 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Anil Gupta',
      patientMobile: '9826012301',
      tokenNumber: 1,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });
    appointmentService.updateAppointment(appt1.id, { estimatedConsultTime: '18:00' });

    // Appointment 2: Scheduled, base ETA 18:15
    const appt2 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Sunita Verma',
      patientMobile: '9826012302',
      tokenNumber: 2,
      status: AppointmentStatus.SCHEDULED,
      appointmentDate: today,
    });
    appointmentService.updateAppointment(appt2.id, { estimatedConsultTime: '18:15' });

    // Appointment 3: Completed, base ETA 17:45 (must NOT be modified)
    const appt3 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Prior Completed Patient',
      patientMobile: '9826012303',
      tokenNumber: 0,
      status: AppointmentStatus.COMPLETED,
      appointmentDate: today,
    });
    appointmentService.updateAppointment(appt3.id, { estimatedConsultTime: '17:45' });

    // Broadcast 30-minute delay
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctor/delay-broadcast',
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        delayMinutes: 30,
        reasonOption: 'HOSPITAL_EMERGENCY',
        customNote: 'Emergency angioplasty at Bansal Hospital',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.delayMinutes, 30);
    assert.equal(body.isDelayActive, true);
    assert.equal(body.affectedAppointmentsCount, 2);
    assert.ok(body.message.includes('30 mins activated'));

    // Verify updated appointments in storage
    const updated1 = await appointmentService.getAppointmentById(appt1.id);
    assert.equal(updated1?.estimatedConsultTime, '18:30'); // 18:00 + 30 mins

    const updated2 = await appointmentService.getAppointmentById(appt2.id);
    assert.equal(updated2?.estimatedConsultTime, '18:45'); // 18:15 + 30 mins

    const updated3 = await appointmentService.getAppointmentById(appt3.id);
    assert.equal(updated3?.estimatedConsultTime, '17:45'); // unchanged!
  });

  it('2. Active delay status query reflects delay banner & TV state', async () => {
    // Broadcast 45 mins delay
    await app.inject({
      method: 'POST',
      url: '/api/v1/doctor/delay-broadcast',
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        delayMinutes: 45,
        reasonOption: 'TRAFFIC_DELAY',
      },
    });

    // Query delay status
    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/v1/doctor/delay-status?clinicId=${testClinicId}&doctorId=${doctorSharma.doctorId}`,
      headers: { authorization: `Bearer ${receptionistToken}` },
    });

    assert.equal(statusRes.statusCode, 200);
    const statusBody = JSON.parse(statusRes.payload);
    assert.equal(statusBody.isDelayActive, true);
    assert.equal(statusBody.delayMinutes, 45);
    assert.ok(statusBody.reasonMessage.includes('delayed by 45 mins'));

    // Check Waiting Room TV snapshot
    const tvRes = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/clinics/${testClinicId}/snapshot`,
    });
    assert.equal(tvRes.statusCode, 200);
    const tvBody = JSON.parse(tvRes.payload);
    const ch1 = tvBody.chambers.find((c: any) => c.chamberNumber === 'CH-1');
    assert.ok(ch1);
    assert.equal(ch1.delayMinutes, 45);
  });

  it('3. 1-Click Delay Clearance (delayMinutes: 0) resets delay state to on-schedule', async () => {
    // 1. Activate 30-min delay
    await app.inject({
      method: 'POST',
      url: '/api/v1/doctor/delay-broadcast',
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        delayMinutes: 30,
        reasonOption: 'EXTENDED_ROUNDS',
      },
    });

    // 2. Clear delay (delayMinutes: 0)
    const clearRes = await app.inject({
      method: 'POST',
      url: '/api/v1/doctor/delay-broadcast',
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        delayMinutes: 0,
        reasonOption: 'ON_TIME_RESUMED',
      },
    });

    assert.equal(clearRes.statusCode, 200);
    const clearBody = JSON.parse(clearRes.payload);
    assert.equal(clearBody.success, true);
    assert.equal(clearBody.isDelayActive, false);
    assert.equal(clearBody.delayMinutes, 0);
    assert.ok(clearBody.message.includes('Delay cleared'));

    // Verify delay status query is on-schedule
    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/v1/doctor/delay-status?clinicId=${testClinicId}&doctorId=${doctorSharma.doctorId}`,
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
    });
    const statusBody = JSON.parse(statusRes.payload);
    assert.equal(statusBody.isDelayActive, false);
    assert.equal(statusBody.delayMinutes, 0);
  });

  it('4. Audit history records delay broadcast history', async () => {
    // Broadcast delay
    await app.inject({
      method: 'POST',
      url: '/api/v1/doctor/delay-broadcast',
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        delayMinutes: 15,
        reasonOption: 'TRAFFIC_DELAY',
        customNote: 'Heavy traffic at Chetak Bridge',
      },
    });

    // Retrieve delay history
    const historyRes = await app.inject({
      method: 'GET',
      url: `/api/v1/doctor/delay-history?clinicId=${testClinicId}&doctorId=${doctorSharma.doctorId}`,
      headers: { authorization: `Bearer ${receptionistToken}` },
    });

    assert.equal(historyRes.statusCode, 200);
    const historyBody = JSON.parse(historyRes.payload);
    assert.equal(historyBody.count, 1);
    assert.equal(historyBody.history[0].delayMinutes, 15);
    assert.equal(historyBody.history[0].customNote, 'Heavy traffic at Chetak Bridge');
    assert.equal(historyBody.history[0].actorRole, UserRole.DOCTOR);
  });

  it('5. Dedicated compounder cannot broadcast delay for another doctor (403 Forbidden)', async () => {
    // Patel compounder attempts to broadcast delay for Dr. Sharma
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctor/delay-broadcast',
      headers: { authorization: `Bearer ${dedicatedPatelCompounderToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        delayMinutes: 30,
        reasonOption: 'HOSPITAL_EMERGENCY',
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'Forbidden');
    assert.ok(body.message.includes('restricted to doctor'));
  });

  it('6. Rejects negative or excessive delay minutes with 400 Validation Error', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctor/delay-broadcast',
      headers: { authorization: `Bearer ${doctorSharmaToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        delayMinutes: -10, // negative!
        reasonOption: 'TRAFFIC_DELAY',
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'Validation Error');
  });
});

