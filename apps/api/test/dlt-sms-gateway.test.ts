import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  smsGatewayBroker,
  normalizeIndianSmsMobile,
  renderDltTemplate,
  DLT_TEMPLATES,
} from '../src/services/sms-broker';
import { createApiServer } from '../src/server';
import { WhatsAppNotificationDTO } from '@medibooking/types';

describe('Phase 27: DLT-Compliant Indian SMS Gateway Broker for Feature Phones', () => {
  beforeEach(() => {
    smsGatewayBroker.clearHistory();
  });

  it('1. Indian Mobile normalizer formats 10-digit, 91-prefixed, and 0-prefixed numbers', () => {
    assert.equal(normalizeIndianSmsMobile('9826012345'), '9826012345');
    assert.equal(normalizeIndianSmsMobile('+919826012345'), '9826012345');
    assert.equal(normalizeIndianSmsMobile('91 9826012345'), '9826012345');
    assert.equal(normalizeIndianSmsMobile('09826012345'), '9826012345');

    assert.throws(() => normalizeIndianSmsMobile('12345'), /Invalid Indian mobile number format/);
    assert.throws(() => normalizeIndianSmsMobile('123456789012345'), /Invalid Indian mobile number format/);
  });

  it('2. DLT Template Substitution replaces {#var#} placeholders strictly matching approved TRAI grammar', () => {
    // 1. BOOKING_CONFIRMATION
    const booking = renderDltTemplate('BOOKING_CONFIRMATION', [
      'Rajesh Sharma',
      '10:30 AM',
      '14',
      'Apex Care Clinic',
    ]);
    assert.equal(booking.dltTemplateId, DLT_TEMPLATES.BOOKING_CONFIRMATION.dltTemplateId);
    assert.equal(
      booking.text,
      '[MEDIBK] Dr. Rajesh Sharma ke sath aapka appointment 10:30 AM baje confirmed hai. Token #14. Clinic: Apex Care Clinic. MediBooking'
    );

    // 2. DOCTOR_DELAY
    const delay = renderDltTemplate('DOCTOR_DELAY', ['Sunita Rao', '45', '11:15 AM', 'Apex Care Polyclinic']);
    assert.equal(delay.dltTemplateId, DLT_TEMPLATES.DOCTOR_DELAY.dltTemplateId);
    assert.equal(
      delay.text,
      '[MEDIBK] Dr. Sunita Rao emergency ke karan 45 minute delay hain. Naya samay lagbhag 11:15 AM. Clinic: Apex Care Polyclinic. MediBooking'
    );

    // 3. SESSION_CANCELLED
    const cancelled = renderDltTemplate('SESSION_CANCELLED', [
      'Alok Verma',
      'https://medibooking.in/reschedule/vip-123',
    ]);
    assert.equal(
      cancelled.text,
      '[MEDIBK] Asuvidha ke liye khed hai. Dr. Alok Verma ka session cancel ho gaya hai. Agle 14 din me VIP priority reschedule link: https://medibooking.in/reschedule/vip-123. MediBooking'
    );

    // 4. WALKIN_INTAKE
    const walkin = renderDltTemplate('WALKIN_INTAKE', [
      'Bhopal Care Center',
      '22',
      'Pooja Nair',
      '3',
      'https://medibooking.in/live/token-22',
    ]);
    assert.equal(
      walkin.text,
      '[MEDIBK] Welcome to Bhopal Care Center. Token #22, Doctor: Dr. Pooja Nair, Room #3. Live status: https://medibooking.in/live/token-22. MediBooking'
    );

    // 5. OTP_LOGIN
    const otp = renderDltTemplate('OTP_LOGIN', ['839201']);
    assert.equal(
      otp.text,
      '[MEDIBK] 839201 is your login OTP for MediBooking. Valid for 5 minutes. Do not share with anyone.'
    );

    // Strict parameter count mismatch guard
    assert.throws(
      () => renderDltTemplate('BOOKING_CONFIRMATION', ['Rajesh Sharma', '10:30 AM']),
      /DLT validation failed for BOOKING_CONFIRMATION: expected 4 variables, received 2/
    );
  });

  it('3. Simulation Mode delivers deterministic msg_dlt_ id and records multi-tenant audit trail', async () => {
    const clinicA = 'c1010000-0000-4000-8000-000000000001';
    const clinicB = 'c1010000-0000-4000-8000-000000000002';

    const resA = await smsGatewayBroker.sendSms({
      recipientMobile: '9826011111',
      templateType: 'BOOKING_CONFIRMATION',
      variables: ['Rajesh Sharma', '10:00 AM', '1', 'Clinic Alpha'],
      clinicId: clinicA,
      referenceId: 'apt-001',
      simulate: true,
    });

    assert.equal(resA.success, true);
    assert.ok(resA.messageId.startsWith('msg_dlt_'));
    assert.equal(resA.dltSenderId, 'MEDIBK');
    assert.equal(resA.status, 'DELIVERED');

    await smsGatewayBroker.sendSms({
      recipientMobile: '9826022222',
      templateType: 'OTP_LOGIN',
      variables: ['123456'],
      clinicId: clinicB,
      simulate: true,
    });

    const clinicAHistory = smsGatewayBroker.getHistory(clinicA);
    const clinicBHistory = smsGatewayBroker.getHistory(clinicB);
    const allHistory = smsGatewayBroker.getHistory();

    assert.equal(clinicAHistory.length, 1);
    assert.equal(clinicAHistory[0].referenceId, 'apt-001');
    assert.equal(clinicBHistory.length, 1);
    assert.equal(allHistory.length, 2);
  });

  it('4. Seamless WhatsApp to DLT SMS fallback helper delivers formatted notifications', async () => {
    const whatsappPayload: WhatsAppNotificationDTO = {
      recipientMobile: '9826033333',
      template: 'doctor_delay_v1',
      parameters: {
        doctor_name: 'Dr. Sunita Rao',
        delay_minutes: '30',
        revised_eta: '11:00 AM',
      },
      clinicId: 'c1010000-0000-4000-8000-000000000001',
      appointmentId: 'apt-delay-01',
      simulate: true,
    };

    const result = await smsGatewayBroker.sendFallbackFromWhatsApp(whatsappPayload);
    assert.equal(result.success, true);
    assert.equal(result.dltTemplateId, DLT_TEMPLATES.DOCTOR_DELAY.dltTemplateId);
    assert.ok(result.renderedText.includes('30 minute delay'));
    assert.ok(result.renderedText.includes('Dr. Sunita Rao'));
  });

  it('5. REST API: POST /sms/test, POST /sms/send, and GET /sms/history', async () => {
    const server = await createApiServer();

    // 1. Test endpoint
    const testRes = await server.inject({
      method: 'POST',
      url: '/api/v1/notifications/sms/test',
      payload: {
        mobile: '9826099999',
        clinicId: 'c1010000-0000-4000-8000-000000000001',
      },
    });
    assert.equal(testRes.statusCode, 200);
    const testJson = JSON.parse(testRes.body);
    assert.equal(testJson.success, true);
    assert.ok(testJson.result.messageId.startsWith('msg_dlt_'));

    // 2. Custom Send endpoint
    const sendRes = await server.inject({
      method: 'POST',
      url: '/api/v1/notifications/sms/send',
      payload: {
        recipientMobile: '9826088888',
        templateType: 'WALKIN_INTAKE',
        variables: ['Bhopal Polyclinic', '10', 'Rajesh Sharma', '2', 'https://medibooking.in/live/10'],
        clinicId: 'c1010000-0000-4000-8000-000000000001',
        referenceId: 'walkin-101',
      },
    });
    assert.equal(sendRes.statusCode, 200);
    const sendJson = JSON.parse(sendRes.body);
    assert.equal(sendJson.success, true);
    assert.equal(sendJson.result.status, 'DELIVERED');

    // 3. History retrieval endpoint
    const historyRes = await server.inject({
      method: 'GET',
      url: '/api/v1/notifications/sms/history?clinicId=c1010000-0000-4000-8000-000000000001',
    });
    assert.equal(historyRes.statusCode, 200);
    const historyJson = JSON.parse(historyRes.body);
    assert.ok(historyJson.total >= 2);

    // 4. Invalid payload rejection (variable count mismatch returns 400)
    const badRes = await server.inject({
      method: 'POST',
      url: '/api/v1/notifications/sms/send',
      payload: {
        recipientMobile: '9826088888',
        templateType: 'WALKIN_INTAKE',
        variables: ['Only one variable'],
        clinicId: 'c1010000-0000-4000-8000-000000000001',
      },
    });
    assert.equal(badRes.statusCode, 400);

    await server.close();
  });
});
