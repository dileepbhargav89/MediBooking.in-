/**
 * Phase 16: Central Receptionist (CLINIC_WIDE) Tabbed Multi-Chamber Queue API Tests
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
import { SEED_DATA } from '@medibooking/database';
import { UserRole, StaffScope, PaymentStatus, TriageSeverity, AppointmentStatus } from '@medibooking/types';

describe('Phase 16: Central Receptionist (CLINIC_WIDE) Tabbed Multi-Chamber Queue API', () => {
  let app: any;
  const testClinicId = SEED_DATA.clinic.id;
  const doctorSharma = SEED_DATA.doctors[0]!; // CH-1
  const doctorPatel = SEED_DATA.doctors[1]!;  // CH-2

  let centralReceptionistToken: string;
  let dedicatedSharmaCompounderToken: string;
  let doctorToken: string;

  beforeEach(async () => {
    appointmentService.reset();
    clinicService.reset();
    doctorService.reset();
    affiliationService.reset();
    authService.reset();
    sessionService.reset();
    app = createApiServer();

    doctorToken = authService.signToken({
      sub: doctorSharma.doctorId,
      mobile: '9826000001',
      role: UserRole.DOCTOR,
      clinicId: testClinicId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

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
  });

  describe('1. Central Receptionist (CLINIC_WIDE) Multi-Chamber Dashboard', () => {
    it('should return all 4 clinic chambers with aggregate metrics and doctor profiles', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reception/queues',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);

      assert.equal(data.clinicId, testClinicId);
      assert.equal(data.staffScope, StaffScope.CLINIC_WIDE);
      assert.equal(data.queues.length, 4);

      const ch1 = data.queues.find((q: any) => q.chamberNumber === 'CH-1');
      assert.ok(ch1);
      assert.equal(ch1.chamberName, SEED_DATA.chambers[0]!.chamberName);
      assert.equal(ch1.doctorName, doctorSharma.fullName);
      assert.equal(ch1.specialty, 'CARDIOLOGY');

      // Clinic-wide metrics
      assert.equal(data.metrics.totalActiveChambers, 4);
      assert.ok(typeof data.metrics.totalWaitingClinicWide === 'number');
      assert.ok(typeof data.metrics.totalExpectedRevenueRupees === 'number');
    });
  });

  describe('2. Triage Urgency Priority Interleaving', () => {
    it('should prioritize URGENT_TRIAGE patients ahead of routine patients in waiting queue', async () => {
      // 1. Routine patient registers first (token 1)
      const res1 = await app.inject({
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
          patientName: 'Kailash Soni',
          mobile: '9826111111',
          triageSeverity: TriageSeverity.ROUTINE,
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      assert.equal(res1.statusCode, 200);

      // 2. Urgent emergency patient registers second (token 2)
      const res2 = await app.inject({
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
          patientName: 'Emergency Patient (Chest Pain)',
          mobile: '9826122222',
          triageSeverity: TriageSeverity.URGENT_TRIAGE,
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      assert.equal(res2.statusCode, 200);

      // 3. Query multi-chamber queues
      const queueRes = await app.inject({
        method: 'GET',
        url: '/api/v1/reception/queues',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(queueRes.statusCode, 200);
      const queueData = JSON.parse(queueRes.body);
      const ch1 = queueData.queues.find((q: any) => q.chamberNumber === 'CH-1');

      // In the waiting queue, the urgent patient must be first (index 0)
      assert.ok(ch1.waitingQueue.length >= 2);
      const firstPatient = ch1.waitingQueue[0];
      assert.equal(firstPatient.triageSeverity, TriageSeverity.URGENT_TRIAGE);
      assert.equal(firstPatient.patientName, 'Emergency Patient (Chest Pain)');

      // Routine patient should be queued after urgent
      const routineIndex = ch1.waitingQueue.findIndex((p: any) => p.patientName === 'Kailash Soni');
      assert.ok(routineIndex > 0);
    });
  });

  describe('3. Dynamic Wait Time Forecasting & 1-Click Delay Integration', () => {
    it('should incorporate 1-click doctor delay broadcast into waiting time calculations', async () => {
      // 1. Doctor Sharma broadcasts a 30-min delay
      const delayRes = await app.inject({
        method: 'POST',
        url: '/api/v1/doctor/delay-broadcast',
        headers: {
          authorization: `Bearer ${doctorToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          clinicId: testClinicId,
          doctorId: doctorSharma.doctorId,
          delayMinutes: 30,
          reasonOption: 'HOSPITAL_EMERGENCY',
        },
      });
      assert.equal(delayRes.statusCode, 200);

      // 2. Query queues
      const queueRes = await app.inject({
        method: 'GET',
        url: '/api/v1/reception/queues',
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(queueRes.statusCode, 200);
      const queueData = JSON.parse(queueRes.body);
      const ch1 = queueData.queues.find((q: any) => q.chamberNumber === 'CH-1');

      assert.equal(ch1.delayMinutes, 30);
      assert.equal(ch1.isDelayActive, true);
      // Wait time includes the 30 min delay
      assert.ok(ch1.estimatedWaitMinutes >= 30);
    });
  });

  describe('4. Dual-Scope Staff Access Restriction', () => {
    it('should filter queues strictly to assigned chamber for DOCTOR_DEDICATED compounder', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reception/queues',
        headers: {
          authorization: `Bearer ${dedicatedSharmaCompounderToken}`,
          'x-clinic-id': testClinicId,
        },
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);

      assert.equal(data.staffScope, StaffScope.DOCTOR_DEDICATED);
      assert.equal(data.queues.length, 1);
      assert.equal(data.queues[0].chamberNumber, 'CH-1');
      assert.equal(data.queues[0].doctorName, doctorSharma.fullName);
    });
  });

  describe('5. Queue Status Transitions (In-Consultation & Completed)', () => {
    it('should transition appointment to IN_CONSULTATION and COMPLETED', async () => {
      // 1. Create walk-in appointment
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
          patientName: 'Sanjay Jain',
          mobile: '9826199999',
          paymentMethod: PaymentStatus.PAID_CASH,
        },
      });
      const appt = JSON.parse(intakeRes.body).appointment;

      // 2. Transition to IN_CONSULTATION
      const startRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/reception/appointment/${appt.id}/status`,
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          status: AppointmentStatus.IN_CONSULTATION,
        },
      });
      assert.equal(startRes.statusCode, 200);

      // Verify currentlyServing reflects Sanjay Jain
      const q1 = await app.inject({
        method: 'GET',
        url: '/api/v1/reception/queues',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
      });
      const ch2Serving = JSON.parse(q1.body).queues.find((q: any) => q.chamberNumber === 'CH-2');
      assert.equal(ch2Serving.currentlyServing.id, appt.id);
      assert.equal(ch2Serving.currentlyServing.patientName, 'Sanjay Jain');

      // 3. Complete Consultation
      const completeRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/reception/appointment/${appt.id}/status`,
        headers: {
          authorization: `Bearer ${centralReceptionistToken}`,
          'x-clinic-id': testClinicId,
        },
        payload: {
          status: AppointmentStatus.COMPLETED,
        },
      });
      assert.equal(completeRes.statusCode, 200);

      // Verify moved to completedQueue
      const q2 = await app.inject({
        method: 'GET',
        url: '/api/v1/reception/queues',
        headers: { authorization: `Bearer ${centralReceptionistToken}`, 'x-clinic-id': testClinicId },
      });
      const ch2Completed = JSON.parse(q2.body).queues.find((q: any) => q.chamberNumber === 'CH-2');
      assert.equal(ch2Completed.currentlyServing, null);
      assert.ok(ch2Completed.completedQueue.some((p: any) => p.id === appt.id));
    });
  });
});
