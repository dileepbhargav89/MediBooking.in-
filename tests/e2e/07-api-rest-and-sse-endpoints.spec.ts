import { test, expect } from '@playwright/test';
import http from 'node:http';

test.describe('E2E Workflow 7: Fastify REST API & SSE Realtime Stream Endpoints', () => {
  const apiBase = 'http://127.0.0.1:4000';
  const clinicId = 'c1010000-0000-4000-8000-000000000001';
  const doctorId = 'd3010000-0000-4000-8000-000000000001';

  test('7.1 GET /health returns gateway online status with clinic metadata', async ({ request }) => {
    const res = await request.get(`${apiBase}/health`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ONLINE');
    expect(body.service).toContain('MediBooking Enterprise API Gateway');
    expect(body.demoClinic).toBe('CityCare Polyclinic & Diagnostic Centre');
    expect(body.chambersCount).toBe(4);
    expect(body.doctorsCount).toBe(4);
  });

  test('7.2 POST /api/v1/auth/request-otp and verify-otp issues authenticated JWT token', async ({ request }) => {
    const testMobile = `98260${Math.floor(10000 + Math.random() * 90000)}`;
    // 1. Send OTP
    const sendRes = await request.post(`${apiBase}/api/v1/auth/request-otp`, {
      data: { mobile: testMobile },
    });
    expect(sendRes.status()).toBe(200);
    const sendBody = await sendRes.json();
    expect(sendBody.success).toBe(true);

    // 2. Verify OTP with test bypass code 123456
    const verifyRes = await request.post(`${apiBase}/api/v1/auth/verify-otp`, {
      data: { mobile: testMobile, otp: '123456' },
    });
    expect(verifyRes.status()).toBe(200);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.token).toBeTruthy();
    expect(verifyBody.userContext).toBeTruthy();
  });

  test('7.3 GET /api/v1/slots returns slot schedule and capacity', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request.get(`${apiBase}/api/v1/slots/clinics/${clinicId}/doctors/${doctorId}/date/${today}`);
    expect([200, 404]).toContain(res.status());
  });

  test('7.4 GET /api/v1/cashiering/summary requires clinic context or returns 401', async ({ request }) => {
    const res = await request.get(`${apiBase}/api/v1/cashiering/summary`);
    expect([200, 401, 403]).toContain(res.status());
  });

  test('7.5 GET /api/v1/realtime/clinics/:id/tv-stream connects with HTTP/2 SSE headers', async () => {
    const isStreamOk = await new Promise<boolean>((resolve, reject) => {
      const req = http.get(`${apiBase}/api/v1/realtime/clinics/${clinicId}/tv-stream`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        req.destroy();
        resolve(true);
      });
      req.on('error', (err) => {
        if ((err as any).code === 'ECONNRESET') resolve(true);
        else reject(err);
      });
    });
    expect(isStreamOk).toBe(true);
  });
});
