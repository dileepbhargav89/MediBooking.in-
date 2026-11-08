import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 19 (Phase 60): WhatsApp Interactive 1-Tap Patient Onboarding Gateway', () => {
  const apiBase = 'http://127.0.0.1:4000';

  test('19.1 Inbound WhatsApp Webhook: First-time patient greeting ("HI") requests DPDP consent, and ("AGREE") auto-provisions token with live tracking link', async () => {
    // 1. Inbound greeting from a new patient mobile
    const newPatientMobile = '9826099999';
    const greetRes = await fetch(`${apiBase}/api/v1/whatsapp/simulate-inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderMobile: newPatientMobile,
        messageText: 'HI',
      }),
    });

    expect(greetRes.status).toBe(200);
    const greetData = await greetRes.json();
    expect(greetData.success).toBe(true);
    expect(greetData.botReply.commandRecognized).toBe('ONBOARD_GREETING');
    expect(greetData.botReply.replyText).toContain('DPDP Act 2023 Digital Consent');
    expect(greetData.botReply.replyText).toContain('AGREE');

    // 2. Patient provides explicit DPDP digital consent via 'AGREE'
    const consentRes = await fetch(`${apiBase}/api/v1/whatsapp/simulate-inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderMobile: newPatientMobile,
        messageText: 'AGREE',
      }),
    });

    expect(consentRes.status).toBe(200);
    const consentData = await consentRes.json();
    expect(consentData.success).toBe(true);
    expect(consentData.botReply.commandRecognized).toBe('ONBOARD_CONSENT_CAPTURED');
    expect(consentData.botReply.dpdpConsentRecorded).toBe(true);
    expect(consentData.botReply.replyText).toContain('अपॉइंटमेंट टोकन पुष्टिकरण');
    expect(consentData.botReply.tokenInfo.tokenNumber).toBeGreaterThan(0);
    expect(consentData.botReply.tokenInfo.chamberNumber).toBe('CH-1');
    expect(consentData.botReply.liveTrackingUrl).toContain('/patient?token=');
  });

  test('19.2 Patient Queue Tracker Deep-Link: Opening /patient?token=18&chamber=CH-1 loads assigned token and WhatsApp DPDP verification badge', async ({
    page,
  }) => {
    // Authenticate as Patient
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Patient Tracker' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/.*\/patient/, { timeout: 15000 });

    // Open WhatsApp live tracking deep-link
    await page.goto('/patient?token=18&chamber=CH-1');

    // Verify assigned token number extracted from URL
    const tokenDisplay = page.getByTestId('assigned-token-number');
    await expect(tokenDisplay).toBeVisible({ timeout: 10000 });
    await expect(tokenDisplay).toHaveText('#18');

    // Verify chamber extracted from URL
    const chamberDisplay = page.getByTestId('assigned-chamber-number');
    await expect(chamberDisplay).toBeVisible();
    await expect(chamberDisplay).toHaveText('CH-1');

    // Verify WhatsApp 1-Tap onboarding badge
    const waBadge = page.getByTestId('badge-whatsapp-onboarding');
    await expect(waBadge).toBeVisible();
    await expect(waBadge).toContainText('WhatsApp 1-Tap Booking');
    await expect(waBadge).toContainText('DPDP Verified');
  });

  test('19.3 Patient Portal WhatsApp Assistant: Interactive chips simulate 1-tap booking and DPDP agreement', async ({
    page,
  }) => {
    // Authenticate as Patient
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Patient Tracker' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/.*\/patient/, { timeout: 15000 });

    // Verify WhatsApp Assistant drawer is visible
    const chatContainer = page.getByTestId('wa-chat-container');
    await expect(chatContainer).toBeVisible({ timeout: 10000 });

    // Tap '1-Tap Book' chip
    const bookChip = page.getByTestId('wa-chip-book');
    await expect(bookChip).toBeVisible();
    await bookChip.click();

    // Verify bot responds with DPDP consent request
    await expect(chatContainer).toContainText('DPDP Act 2023 Digital Consent', { timeout: 10000 });

    // Tap 'Agree DPDP' chip
    const agreeChip = page.getByTestId('wa-chip-agree');
    await expect(agreeChip).toBeVisible();
    await agreeChip.click();

    // Verify bot confirms token and UI activates WhatsApp onboarding badge
    await expect(chatContainer).toContainText('टोकन पुष्टिकरण', { timeout: 10000 });
    const waBadge = page.getByTestId('badge-whatsapp-onboarding');
    await expect(waBadge).toBeVisible();
  });

  test('19.4 Backend REST API: POST /api/v1/whatsapp/patient-onboard enforces DPDP consent and normalizes Indian phone numbers', async () => {
    // 1. Reject missing DPDP consent
    const rejectRes = await fetch(`${apiBase}/api/v1/whatsapp/patient-onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '+919826077777',
        dpdpConsent: false,
      }),
    });

    expect(rejectRes.status).toBe(400);
    const rejectData = await rejectRes.json();
    expect(rejectData.error).toContain('DPDP Consent Required');

    // 2. Successful onboarding with DPDP consent & phone normalization (+91 with spaces)
    const acceptRes = await fetch(`${apiBase}/api/v1/whatsapp/patient-onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '+91 98260 77777',
        patientName: 'Meera Rao',
        chamberNumber: 'CH-1',
        dpdpConsent: true,
      }),
    });

    expect(acceptRes.status).toBe(201);
    const acceptData = await acceptRes.json();
    expect(acceptData.success).toBe(true);
    expect(acceptData.patient.mobile).toBe('9826077777'); // Stripped prefix & whitespace
    expect(acceptData.patient.name).toBe('Meera Rao');
    expect(acceptData.patient.dpdpConsent).toBe(true);
    expect(acceptData.token.chamberNumber).toBe('CH-1');
    expect(acceptData.token.liveTrackingUrl).toContain('/patient?token=');
  });

  test('19.5 Front-Desk Reception Queue verifies multi-channel WhatsApp 1-Tap intake patient presence', async ({
    page,
  }) => {
    // Authenticate as Reception Desk
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    // Verify WhatsApp-onboarded patient appears in the queue list
    await expect(page.locator('text=Sunita Mehra')).toBeVisible();
    await expect(page.locator('text=whatsapp 1tap').first()).toBeVisible();
  });
});
