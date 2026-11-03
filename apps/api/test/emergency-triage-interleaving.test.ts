/**
 * Phase 19: Front-Desk Emergency Override & Triage Urgency Priority Interleaving Tests
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
import { triageInterleavingService } from '../src/services/triage-interleaving-service';
import { queueTransitionController } from '../src/services/queue-transition-controller';
import { SEED_DATA } from '@medibooking/database';
import {
  UserRole,
  StaffScope,
  PaymentStatus,
  TriageSeverity,
  AppointmentStatus,
  BookingSource,
} from '@medibooking/types';

describe('Phase 19: Emergency Override & Triage Priority Interleaving', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let centralReceptionistToken: string;
  let dedicatedSharmaCompounderToken: string;
  let dedicatedPatelCompounderToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    sessionService.reset();
    triageInterleavingService.reset();
    queueTransitionController.reset();
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

  it('1. Emergency walk-in intake bypasses session walk-in quota limit', async () => {
    const today = new Date().toISOString().split('T')[0] as string;
    // Find session for Dr. Sharma and cap walk-ins to 1
    const sessions = await sessionService.getSessionsByDoctor(doctorSharma.doctorId, testClinicId);
    assert.ok(sessions.length > 0);
    const dayOfWeek = (new Date().getDay() === 0 ? 7 : new Date().getDay()) as any;
    await sessionService.updateSession(sessions[0]!.id, { dayOfWeek, maxWalkInTokens: 1 });

    // Intake 1 -> Routine Token #1 (allowed)
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/reception/intake',
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        chamberNumber: 'CH-1',
        patientName: 'Routine Patient One',
        mobile: '9826144441',
        paymentMethod: PaymentStatus.PAID_CASH,
      },
    });
    assert.equal(res1.statusCode, 200);

    // Intake 2 -> Routine Token #2 (rejected with 409 because quota = 1)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/reception/intake',
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        chamberNumber: 'CH-1',
        patientName: 'Routine Patient Two',
        mobile: '9826144442',
        paymentMethod: PaymentStatus.PAID_CASH,
      },
    });
    assert.equal(res2.statusCode, 409);

    // Intake 3 -> Emergency Walk-In with emergencyOverride: true (bypasses cap!)
    const resEmergency = await app.inject({
      method: 'POST',
      url: '/api/v1/reception/intake',
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        clinicId: testClinicId,
        doctorId: doctorSharma.doctorId,
        chamberNumber: 'CH-1',
        patientName: 'Emergency Chest Pain Patient',
        mobile: '9826144443',
        paymentMethod: PaymentStatus.PAID_CASH,
        triageSeverity: TriageSeverity.EMERGENCY,
        emergencyOverride: true,
      },
    });
    assert.equal(resEmergency.statusCode, 200);
    const bodyEmergency = JSON.parse(resEmergency.payload);
    assert.equal(bodyEmergency.appointment.tokenNumber, 2);
    assert.equal(bodyEmergency.appointment.triageSeverity, TriageSeverity.EMERGENCY);
  });

  it('2. Queue interleaving: Emergency patient jumps ahead of earlier routine tokens in chamber queue', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    // Routine Patient 1 (Token #1) - Arrived
    appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Ramesh Routine',
      patientMobile: '9826012341',
      tokenNumber: 1,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    // Routine Patient 2 (Token #2) - Arrived
    appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Suresh Routine',
      patientMobile: '9826012342',
      tokenNumber: 2,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    // Emergency Patient (Token #3) - Just arrived with acute chest pain
    appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Kailash Emergency',
      patientMobile: '9826012343',
      tokenNumber: 3,
      triageSeverity: TriageSeverity.EMERGENCY,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    // Query Interleaved Queue via API
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reception/queues/chamber/CH-1/interleaved',
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.chamberNumber, 'CH-1');
    assert.equal(body.waitingCount, 3);
    assert.equal(body.emergencyCount, 1);

    // Verify interleaving order:
    // Rank 1 MUST be Kailash Emergency (Token #3) despite arriving later!
    assert.equal(body.queue[0].priorityRank, 1);
    assert.equal(body.queue[0].appointment.tokenNumber, 3);
    assert.equal(body.queue[0].isEmergencyInterleaved, true);

    // Rank 2 and 3 are routine tokens in FIFO order (Token #1, then Token #2)
    assert.equal(body.queue[1].priorityRank, 2);
    assert.equal(body.queue[1].appointment.tokenNumber, 1);

    assert.equal(body.queue[2].priorityRank, 3);
    assert.equal(body.queue[2].appointment.tokenNumber, 2);
  });

  it('3. Multi-tier triage hierarchy: EMERGENCY (100) > URGENT (80) > POST_OP (50) > ROUTINE (10)', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    const r1 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'P-Routine',
      patientMobile: '9826010001',
      tokenNumber: 1,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    const po2 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'P-PostOp',
      patientMobile: '9826010002',
      tokenNumber: 2,
      triageSeverity: TriageSeverity.POST_OP,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    const urg3 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'P-Urgent',
      patientMobile: '9826010003',
      tokenNumber: 3,
      triageSeverity: TriageSeverity.URGENT_TRIAGE,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    const em4 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'P-Emergency',
      patientMobile: '9826010004',
      tokenNumber: 4,
      triageSeverity: TriageSeverity.EMERGENCY,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    const queueData = triageInterleavingService.getInterleavedQueue(testClinicId, 'CH-1', today);
    assert.equal(queueData.waitingCount, 4);

    // Verify exact ordering:
    assert.equal(queueData.queue[0]?.appointment.id, em4.id);  // EMERGENCY (rank 1)
    assert.equal(queueData.queue[1]?.appointment.id, urg3.id); // URGENT_TRIAGE (rank 2)
    assert.equal(queueData.queue[2]?.appointment.id, po2.id);  // POST_OP (rank 3)
    assert.equal(queueData.queue[3]?.appointment.id, r1.id);   // ROUTINE (rank 4)
  });

  it('4. Mid-queue clinical escalation promotes waiting patient with audit trail', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    const appt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Vikas Sharma',
      patientMobile: '9826099988',
      tokenNumber: 5,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    // Escalate triage to EMERGENCY with clinical justification
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appt.id}/triage`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        triageSeverity: TriageSeverity.EMERGENCY,
        clinicalJustification: 'Patient reported sudden radiating left arm pain and profuse sweating',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.appointment.triageSeverity, TriageSeverity.EMERGENCY);
    assert.equal(body.auditRecord.fromSeverity, TriageSeverity.ROUTINE);
    assert.equal(body.auditRecord.toSeverity, TriageSeverity.EMERGENCY);
    assert.ok(body.auditRecord.clinicalJustification.includes('sudden radiating'));

    // Retrieve audit history
    const historyRes = await app.inject({
      method: 'GET',
      url: `/api/v1/appointments/${appt.id}/triage-history`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
    });

    assert.equal(historyRes.statusCode, 200);
    const historyBody = JSON.parse(historyRes.payload);
    assert.equal(historyBody.count, 1);
    assert.equal(historyBody.history[0].toSeverity, TriageSeverity.EMERGENCY);
  });

  it('5. 1-Tap callNextPatient calls highest urgency waiting patient into IN_CONSULTATION', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    // Routine Token 1
    appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Routine Patient',
      patientMobile: '9826055551',
      tokenNumber: 1,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    // Emergency Token 2
    const emergencyAppt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Emergency Patient',
      patientMobile: '9826055552',
      tokenNumber: 2,
      triageSeverity: TriageSeverity.EMERGENCY,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    // Call Next Patient
    const callResult = appointmentService.callNextPatient(testClinicId, doctorSharma.doctorId, 'CH-1', today);
    assert.ok(callResult.servingAppointment);
    assert.equal(callResult.servingAppointment.id, emergencyAppt.id);
    assert.equal(callResult.servingAppointment.tokenNumber, 2);
    assert.equal(callResult.servingAppointment.status, AppointmentStatus.IN_CONSULTATION);
  });

  it('6. Dedicated compounder cannot update triage severity for other doctors (403 Forbidden)', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    const sharmaAppt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Sharma Patient',
      patientMobile: '9826066661',
      tokenNumber: 1,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    // Dedicated Patel compounder tries to update Sharma appointment
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${sharmaAppt.id}/triage`,
      headers: { authorization: `Bearer ${dedicatedPatelCompounderToken}` },
      payload: {
        triageSeverity: TriageSeverity.URGENT_TRIAGE,
        clinicalJustification: 'Attempting cross-chamber triage update',
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'Forbidden');
    assert.ok(body.message.includes('restricted to doctor'));
  });

  it('7. Rejects triage update without clinical justification (400 Bad Request)', async () => {
    const today = new Date().toISOString().split('T')[0] as string;

    const appt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Valid Patient',
      patientMobile: '9826077771',
      tokenNumber: 1,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.WAITING,
      appointmentDate: today,
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appt.id}/triage`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        triageSeverity: TriageSeverity.URGENT_TRIAGE,
        clinicalJustification: '', // empty!
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'Validation Error');
  });
});
