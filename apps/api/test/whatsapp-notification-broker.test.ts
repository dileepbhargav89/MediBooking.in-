/**
 * Phase 26: WhatsApp Business Cloud API Outbound Notification Broker Test Suite
 * Validates E.164 formatting, template parameterization, SMS fallback detection, and audit trails.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WhatsAppBroker, whatsappBroker } from '../src/services/whatsapp-broker';
import { createApiServer } from '../src/server';
import { SEED_DATA } from '@medibooking/database';

describe('Phase 26: WhatsApp Business Cloud API Outbound Notification Broker', () => {
  const clinicId = SEED_DATA.clinic.id;

  beforeEach(() => {
    whatsappBroker.reset();
  });

  test('1. Indian phone formatting normalizes 10-digit and prefixed numbers to E.164', () => {
    const broker = new WhatsAppBroker({ forceSimulation: true });

    assert.equal(broker.formatToE164IndianPhone('9826012345'), '919826012345');
    assert.equal(broker.formatToE164IndianPhone('09826012345'), '919826012345');
    assert.equal(broker.formatToE164IndianPhone('+91 98260 12345'), '919826012345');
    assert.equal(broker.formatToE164IndianPhone('919826012345'), '919826012345');
  });

  test('2. Template Component Assembly builds sequential parameters for booking, delay, and cancellation', () => {
    const broker = new WhatsAppBroker({ forceSimulation: true });

    // 1. Booking confirmation template
    const bookingComp = broker.buildTemplateComponents('booking_confirmation_v1', {
      patientName: 'Ramesh Patel',
      doctorName: 'Dr. Rajesh Sharma',
      specialty: 'Cardiology',
      chamberNumber: 'CH-1',
      tokenNumber: 8,
      appointmentTime: '6:30 PM',
    });
    assert.equal(bookingComp.length, 1);
    assert.equal(bookingComp[0].type, 'body');
    assert.equal(bookingComp[0].parameters.length, 6);
    assert.equal(bookingComp[0].parameters[0].text, 'Ramesh Patel');
    assert.equal(bookingComp[0].parameters[4].text, '8');

    // 2. Doctor delay alert template
    const delayComp = broker.buildTemplateComponents('doctor_delay_v1', {
      doctorName: 'Dr. Rajesh Sharma',
      delayMinutes: 20,
      reason: 'Emergency Hospital Round',
      updatedEta: '6:50 PM',
    });
    assert.equal(delayComp[0].parameters[1].text, '20');
    assert.equal(delayComp[0].parameters[2].text, 'Emergency Hospital Round');

    // 3. Emergency session cancellation template
    const cancelComp = broker.buildTemplateComponents('session_cancelled_v1', {
      doctorName: 'Dr. Sharma',
      reason: 'Personal Crisis',
      rescheduleUrl: 'https://medibooking.in/reschedule/claim?id=123',
    });
    assert.equal(cancelComp[0].parameters[1].text, 'Personal Crisis');
    assert.ok(cancelComp[0].parameters[2].text.includes('reschedule'));
  });

  test('3. Simulation Mode delivers deterministic wamid and records audit log', async () => {
    const broker = new WhatsAppBroker({ forceSimulation: true });

    const result = await broker.sendNotification({
      recipientMobile: '9826055555',
      template: 'booking_confirmation_v1',
      parameters: {
        patientName: 'Amit Verma',
        doctorName: 'Dr. Sharma',
        specialty: 'General Medicine',
        chamberNumber: 'CH-2',
        tokenNumber: 3,
        appointmentTime: 'Today 7:00 PM',
      },
      clinicId,
      appointmentId: 'apt-test-99',
    });

    assert.equal(result.success, true);
    assert.equal(result.status, 'SIMULATED');
    assert.equal(result.recipient, '919826055555');
    assert.ok(result.wamid?.startsWith('wamid.HBgL'));
    assert.equal(result.shouldFallbackToSms, false);

    // Verify audit record
    const history = broker.getHistory(clinicId);
    assert.equal(history.length, 1);
    assert.equal(history[0]?.recipientMobile, '9826055555');
    assert.equal(history[0]?.template, 'booking_confirmation_v1');
    assert.equal(history[0]?.appointmentId, 'apt-test-99');
  });

  test('4. REST API: POST /api/v1/notifications/whatsapp/test returns 200 OK', async () => {
    const app = createApiServer();

    const testRes = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/whatsapp/test',
      payload: {
        mobile: '9826012345',
        clinicId,
      },
    });

    assert.equal(testRes.statusCode, 200);
    const body = JSON.parse(testRes.payload);
    assert.equal(body.success, true);
    assert.ok(body.result.wamid);

    await app.close();
  });

  test('5. REST API: POST /api/v1/notifications/whatsapp/send and history audit', async () => {
    const app = createApiServer();

    // 1. Send simulated notification via REST
    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/whatsapp/send',
      payload: {
        recipientMobile: '9826077777',
        template: 'walkin_intake_v1',
        parameters: {
          patientName: 'Deepak Patel',
          doctorName: 'Dr. Sharma',
          chamberNumber: 'CH-1',
          tokenNumber: 12,
        },
        clinicId,
        simulate: true,
      },
    });

    assert.equal(sendRes.statusCode, 200);
    const sendBody = JSON.parse(sendRes.payload);
    assert.equal(sendBody.success, true);
    assert.equal(sendBody.result.recipient, '919826077777');

    // 2. Query history
    const histRes = await app.inject({
      method: 'GET',
      url: `/api/v1/notifications/whatsapp/history?clinicId=${clinicId}`,
    });

    assert.equal(histRes.statusCode, 200);
    const histBody = JSON.parse(histRes.payload);
    assert.ok(histBody.total >= 1);
    assert.ok(histBody.history.some((h: any) => h.recipientMobile === '9826077777'));

    // 3. Reject invalid template name with 400
    const invalidRes = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/whatsapp/send',
      payload: {
        recipientMobile: '9826077777',
        template: 'unregistered_spam_template',
        parameters: {},
        clinicId,
      },
    });
    assert.equal(invalidRes.statusCode, 400);

    await app.close();
  });
});
