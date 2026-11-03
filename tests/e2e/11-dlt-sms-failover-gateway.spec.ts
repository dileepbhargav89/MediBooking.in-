import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 11 (Phase 52): Multi-Provider DLT SMS Failover Gateway with Regional Carrier Routing', () => {
  const apiBase = 'http://127.0.0.1:4000';
  const clinicId = 'c1010000-0000-4000-8000-000000000001';

  test('11.1 Super Admin portal displays live carrier circuit breaker status across all 3 DLT tiers', async ({ page }) => {
    // 1. Authenticate as Super Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 10000 });

    // 2. Switch to Gateway Telemetry Tab
    const telemetryTab = page.locator('button', { hasText: /Gateway Telemetry/i });
    await expect(telemetryTab).toBeVisible();
    await telemetryTab.click();

    // 3. Verify Circuit Breaker Telemetry Card
    await expect(page.locator('text=Multi-Provider DLT SMS Carrier Failover Circuit Breaker')).toBeVisible();
    await expect(page.locator('text=3/3 CARRIERS HEALTHY')).toBeVisible();
    await expect(page.locator('text=Tier 1: Gupshup')).toBeVisible();
    await expect(page.locator('text=Tier 2: Exotel')).toBeVisible();
    await expect(page.locator('text=Tier 3: Twilio')).toBeVisible();
  });

  test('11.2 Backend REST API: Primary DLT SMS succeeds with Gupshup and auto-fails over to Exotel and Twilio when carriers degrade', async ({ request }) => {
    // 1. Normal dispatch -> Uses Primary Tier (Gupshup)
    const normalRes = await request.post(`${apiBase}/api/v1/notifications/sms/failover-send`, {
      data: {
        recipientMobile: '9826012345',
        templateType: 'BOOKING_CONFIRMATION',
        variables: ['Dr. Rajesh Sharma', '06:00 PM', '15', 'CityCare Polyclinic'],
        clinicId,
      },
    });

    expect(normalRes.status()).toBe(200);
    const normalData = await normalRes.json();
    expect(normalData.success).toBe(true);
    expect(normalData.providerUsed).toBe('GUPSHUP_ENTERPRISE_DLT');
    expect(normalData.failoverTriggered).toBe(false);
    expect(normalData.attemptsCount).toBe(1);

    // 2. Forced Gupshup failure -> Seamless Auto-Failover to Secondary Tier (Exotel)
    const failoverRes = await request.post(`${apiBase}/api/v1/notifications/sms/failover-send`, {
      data: {
        recipientMobile: '9826012345',
        templateType: 'DOCTOR_DELAY',
        variables: ['Dr. Rajesh Sharma', '20', '06:20 PM', 'CityCare Polyclinic'],
        clinicId,
        forceProviderFailure: ['GUPSHUP_ENTERPRISE_DLT'],
      },
    });

    expect(failoverRes.status()).toBe(200);
    const failoverData = await failoverRes.json();
    expect(failoverData.success).toBe(true);
    expect(failoverData.providerUsed).toBe('EXOTEL_TELECOM_DLT');
    expect(failoverData.failoverTriggered).toBe(true);
    expect(failoverData.attemptsCount).toBe(2);
    expect(failoverData.auditTrail[0].error).toContain('Carrier 503');

    // 3. Forced Gupshup + Exotel failure -> Ultimate Fallback to Tertiary Tier (Twilio)
    const tertiaryRes = await request.post(`${apiBase}/api/v1/notifications/sms/failover-send`, {
      data: {
        recipientMobile: '9826012345',
        templateType: 'SESSION_CANCELLED',
        variables: ['Dr. Rajesh Sharma', 'https://medibooking.in/reschedule/vip'],
        clinicId,
        forceProviderFailure: ['GUPSHUP_ENTERPRISE_DLT', 'EXOTEL_TELECOM_DLT'],
      },
    });

    expect(tertiaryRes.status()).toBe(200);
    const tertiaryData = await tertiaryRes.json();
    expect(tertiaryData.success).toBe(true);
    expect(tertiaryData.providerUsed).toBe('TWILIO_GLOBAL_DLT');
    expect(tertiaryData.failoverTriggered).toBe(true);
    expect(tertiaryData.attemptsCount).toBe(3);

    // 4. Query Carrier Circuit Status
    const statusRes = await request.get(`${apiBase}/api/v1/notifications/sms/circuit-status`);
    expect(statusRes.status()).toBe(200);
    const statusData = await statusRes.json();
    expect(statusData.activeCarriersCount).toBe(3);
    expect(statusData.circuits.GUPSHUP_ENTERPRISE_DLT).toBeTruthy();
    expect(statusData.circuits.EXOTEL_TELECOM_DLT).toBeTruthy();
    expect(statusData.circuits.TWILIO_GLOBAL_DLT).toBeTruthy();
  });
});

