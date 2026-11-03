/**
 * Phase 18: Non-Linear Appointment Queue State Transition Controller Tests
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
import { queueTransitionController } from '../src/services/queue-transition-controller';
import { SEED_DATA } from '@medibooking/database';
import { UserRole, StaffScope, PaymentStatus, TriageSeverity, AppointmentStatus } from '@medibooking/types';

describe('Phase 18: Queue State Transition Controller', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let centralReceptionistToken: string;
  let dedicatedSharmaToken: string;
  let dedicatedPatelToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    sessionService.reset();
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

    dedicatedSharmaToken = authService.signToken({
      sub: 'usr-comp-sharma',
      mobile: '9826022222',
      role: UserRole.RECEPTIONIST,
      clinicId: testClinicId,
      staffScope: StaffScope.DOCTOR_DEDICATED,
      dedicatedDoctorId: doctorSharma.doctorId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    dedicatedPatelToken = authService.signToken({
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

  it('1. Direct call-in (SCHEDULED -> IN_CONSULTATION) automatically backfills arrivedAt and actualStartTime', async () => {
    const today = new Date().toISOString().split('T')[0];
    const appt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      patientName: 'Ramesh Verma',
      patientMobile: '9826099901',
      patientAge: 48,
      patientGender: 'MALE',
      appointmentDate: today,
      slotTime: '10:00 AM',
      chamberNumber: 'CH-1',
      tokenNumber: 1,
      paymentStatus: PaymentStatus.PAID_CASH,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.SCHEDULED,
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appt.id}/transition`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        status: AppointmentStatus.IN_CONSULTATION,
        notes: 'Called directly into chamber by doctor',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.appointment.status, AppointmentStatus.IN_CONSULTATION);
    assert.ok(body.appointment.arrivedAt, 'arrivedAt should be auto-backfilled');
    assert.ok(body.appointment.actualStartTime, 'actualStartTime should be populated');
    assert.equal(body.transitionRecord.autoBackfilledArrived, true);
    assert.equal(body.transitionRecord.fromStatus, AppointmentStatus.SCHEDULED);
    assert.equal(body.transitionRecord.toStatus, AppointmentStatus.IN_CONSULTATION);
  });

  it('2. Diagnostic step-out (IN_CONSULTATION -> WAITING) accommodates in-clinic pathology / lab test', async () => {
    const today = new Date().toISOString().split('T')[0];
    const appt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      patientName: 'Sunita Patel',
      patientMobile: '9826099902',
      patientAge: 39,
      patientGender: 'FEMALE',
      appointmentDate: today,
      slotTime: '10:15 AM',
      chamberNumber: 'CH-1',
      tokenNumber: 2,
      paymentStatus: PaymentStatus.PAID_UPI_QR,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.IN_CONSULTATION,
      arrivedAt: new Date().toISOString(),
      actualStartTime: '10:15 AM',
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appt.id}/transition`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        status: AppointmentStatus.WAITING,
        notes: 'Sent to adjacent diagnostic lab for rapid blood glucose test',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.appointment.status, AppointmentStatus.WAITING);
    assert.equal(body.transitionRecord.fromStatus, AppointmentStatus.IN_CONSULTATION);
    assert.equal(body.transitionRecord.toStatus, AppointmentStatus.WAITING);
  });

  it('3. Quick report review completion (WAITING -> COMPLETED) directly without re-entering IN_CONSULTATION', async () => {
    const today = new Date().toISOString().split('T')[0];
    const appt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      patientName: 'Mohan Lal',
      patientMobile: '9826099903',
      patientAge: 55,
      patientGender: 'MALE',
      appointmentDate: today,
      slotTime: '10:30 AM',
      chamberNumber: 'CH-1',
      tokenNumber: 3,
      paymentStatus: PaymentStatus.PAID_CASH,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.WAITING,
      arrivedAt: new Date().toISOString(),
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appt.id}/transition`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        status: AppointmentStatus.COMPLETED,
        notes: 'Doctor reviewed lab report at reception desk; prescription given',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.appointment.status, AppointmentStatus.COMPLETED);
    assert.ok(body.appointment.actualEndTime, 'actualEndTime should be recorded');
  });

  it('4. Chamber single-occupancy invariant: calling new patient auto-completes existing patient in consultation', async () => {
    const today = new Date().toISOString().split('T')[0];
    const patient1 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      patientName: 'Patient One',
      patientMobile: '9826099911',
      patientAge: 40,
      patientGender: 'MALE',
      appointmentDate: today,
      slotTime: '10:00 AM',
      chamberNumber: 'CH-1',
      tokenNumber: 1,
      paymentStatus: PaymentStatus.PAID_CASH,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.IN_CONSULTATION,
      arrivedAt: new Date().toISOString(),
      actualStartTime: '10:02 AM',
    });

    const patient2 = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      patientName: 'Patient Two',
      patientMobile: '9826099912',
      patientAge: 32,
      patientGender: 'FEMALE',
      appointmentDate: today,
      slotTime: '10:15 AM',
      chamberNumber: 'CH-1',
      tokenNumber: 2,
      paymentStatus: PaymentStatus.PAID_CASH,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.WAITING,
      arrivedAt: new Date().toISOString(),
    });

    // Call Patient 2 into IN_CONSULTATION
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${patient2.id}/transition`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        status: AppointmentStatus.IN_CONSULTATION,
        notes: 'Calling Token #2 into Chamber 1',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.appointment.id, patient2.id);
    assert.equal(body.appointment.status, AppointmentStatus.IN_CONSULTATION);
    assert.ok(body.autoCompletedPrevious, 'Previous patient should be auto-completed');
    assert.equal(body.autoCompletedPrevious.id, patient1.id);
    assert.equal(body.autoCompletedPrevious.status, AppointmentStatus.COMPLETED);

    // Verify patient 1 status in database
    const updatedPatient1 = await appointmentService.getAppointmentById(patient1.id);
    assert.equal(updatedPatient1?.status, AppointmentStatus.COMPLETED);
  });

  it('5. Terminal state locked: closed appointment cannot transition without allowReopen: true', async () => {
    const today = new Date().toISOString().split('T')[0];
    const appt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      patientName: 'Asha Gupta',
      patientMobile: '9826099904',
      patientAge: 62,
      patientGender: 'FEMALE',
      appointmentDate: today,
      slotTime: '11:00 AM',
      chamberNumber: 'CH-1',
      tokenNumber: 4,
      paymentStatus: PaymentStatus.PAID_CASH,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.COMPLETED,
    });

    // Attempt to move back to WAITING without allowReopen
    const failRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appt.id}/transition`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        status: AppointmentStatus.WAITING,
        notes: 'Accidental completion revert',
      },
    });

    assert.equal(failRes.statusCode, 400);
    const failBody = JSON.parse(failRes.payload);
    assert.equal(failBody.error, 'Bad Request');
    assert.ok(failBody.message.includes('TERMINAL_STATE_LOCKED'));

    // Attempt with allowReopen: true
    const okRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appt.id}/transition`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: {
        status: AppointmentStatus.WAITING,
        notes: 'Admin reopened appointment after accidental closure',
        allowReopen: true,
      },
    });

    assert.equal(okRes.statusCode, 200);
    const okBody = JSON.parse(okRes.payload);
    assert.equal(okBody.success, true);
    assert.equal(okBody.appointment.status, AppointmentStatus.WAITING);
  });

  it('6. Audit history retrieval via GET /api/v1/appointments/:id/transitions', async () => {
    const today = new Date().toISOString().split('T')[0];
    const appt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      patientName: 'Devendra Joshi',
      patientMobile: '9826099905',
      patientAge: 35,
      patientGender: 'MALE',
      appointmentDate: today,
      slotTime: '11:15 AM',
      chamberNumber: 'CH-1',
      tokenNumber: 5,
      paymentStatus: PaymentStatus.PAID_CASH,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.SCHEDULED,
    });

    // Step 1: Mark Arrived
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appt.id}/transition`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: { status: AppointmentStatus.ARRIVED, notes: 'Patient reached reception' },
    });

    // Step 2: Mark In Consultation
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${appt.id}/transition`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
      payload: { status: AppointmentStatus.IN_CONSULTATION, notes: 'Entered doctor chamber' },
    });

    // Query transitions audit
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/appointments/${appt.id}/transitions`,
      headers: { authorization: `Bearer ${centralReceptionistToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.appointmentId, appt.id);
    assert.equal(body.count, 2);
    assert.equal(body.transitions[0].fromStatus, AppointmentStatus.SCHEDULED);
    assert.equal(body.transitions[0].toStatus, AppointmentStatus.ARRIVED);
    assert.equal(body.transitions[1].fromStatus, AppointmentStatus.ARRIVED);
    assert.equal(body.transitions[1].toStatus, AppointmentStatus.IN_CONSULTATION);
  });

  it('7. Dedicated compounder cannot transition appointments for other doctors (403 Forbidden)', async () => {
    const today = new Date().toISOString().split('T')[0];
    const sharmaAppt = appointmentService.createAppointment({
      clinicId: testClinicId,
      doctorId: doctorSharma.doctorId,
      patientName: 'Sharma Patient',
      patientMobile: '9826099906',
      patientAge: 42,
      patientGender: 'MALE',
      appointmentDate: today,
      slotTime: '11:30 AM',
      chamberNumber: 'CH-1',
      tokenNumber: 6,
      paymentStatus: PaymentStatus.PAID_CASH,
      triageSeverity: TriageSeverity.ROUTINE,
      status: AppointmentStatus.SCHEDULED,
    });

    // Patel compounder tries to transition Sharma appointment
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${sharmaAppt.id}/transition`,
      headers: { authorization: `Bearer ${dedicatedPatelToken}` },
      payload: {
        status: AppointmentStatus.IN_CONSULTATION,
        notes: 'Unauthorized attempt',
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.error, 'Forbidden');
    assert.ok(body.message.includes('restricted'));
  });
});
