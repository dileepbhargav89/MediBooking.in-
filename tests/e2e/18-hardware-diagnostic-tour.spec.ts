import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 18 (Phase 59): Guided In-App Product Tour & Hardware Diagnostic Checklist', () => {
  test('18.1 Receptionist Dashboard: Interactive Product Tour walks through intake, chambers, cashiering, and hardware', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // 1. Log in as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/.*\/receptionist/, { timeout: 15000 });

    // 2. Open Guided Product Tour
    const startTourBtn = page.locator('[data-testid="btn-start-tour"]');
    await expect(startTourBtn).toBeVisible();
    await startTourBtn.click();

    // 3. Step 1: Rapid Walk-In Intake
    const tourCard = page.locator('[data-testid="product-tour-card"]');
    await expect(tourCard).toBeVisible();
    await expect(page.locator('[data-testid="tour-step-counter"]')).toContainText('Step 1 of 4');
    await expect(page.locator('[data-testid="tour-step-title"]')).toContainText('Rapid Walk-In Intake');

    // Advance to Step 2
    const nextBtn = page.locator('[data-testid="tour-next-btn"]');
    await nextBtn.click();

    // 4. Step 2: Multi-Chamber Queue Routing
    await expect(page.locator('[data-testid="tour-step-counter"]')).toContainText('Step 2 of 4');
    await expect(page.locator('[data-testid="tour-step-title"]')).toContainText('Multi-Chamber Queue Tabs');

    // Advance to Step 3
    await nextBtn.click();

    // 5. Step 3: Cash Drawer & BharatQR
    await expect(page.locator('[data-testid="tour-step-counter"]')).toContainText('Step 3 of 4');
    await expect(page.locator('[data-testid="tour-step-title"]')).toContainText('Cash Drawer & Dynamic BharatQR');

    // Advance to Step 4
    await nextBtn.click();

    // 6. Step 4: Hardware & Diagnostics
    await expect(page.locator('[data-testid="tour-step-counter"]')).toContainText('Step 4 of 4');
    await expect(page.locator('[data-testid="tour-step-title"]')).toContainText('Hardware & Diagnostics Checklist');

    // Finish Tour
    const finishBtn = page.locator('[data-testid="tour-finish-btn"]');
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    // Verify tour card dismissed
    await expect(tourCard).not.toBeVisible();
  });

  test('18.2 Receptionist Dashboard: 1-Click Hardware Diagnostics executes tests for Printer, Audio Chime, SSE, and IndexedDB', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // 1. Log in as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/.*\/receptionist/, { timeout: 15000 });

    // 2. Open Hardware Diagnostics Modal
    const diagBtn = page.locator('[data-testid="btn-hardware-diagnostics"]');
    await expect(diagBtn).toBeVisible();
    await diagBtn.click();

    const diagContainer = page.locator('[data-testid="hardware-diagnostics-container"]');
    await expect(diagContainer).toBeVisible();

    // 3. Test ESC/POS 80mm Printer
    const testPrinterBtn = page.locator('[data-testid="btn-test-printer"]');
    await testPrinterBtn.click();
    await expect(page.locator('[data-testid="printer-status-badge"]')).toContainText('ESC/POS Driver Ready');

    // 4. Test Waiting Room Audio Chime & TTS
    const testAudioBtn = page.locator('[data-testid="btn-test-audio"]');
    await testAudioBtn.click();
    await expect(page.locator('[data-testid="audio-status-badge"]')).toContainText('Audio Engine Ready');

    // 5. Test Fastify Realtime SSE Stream Latency
    const testSseBtn = page.locator('[data-testid="btn-test-sse"]');
    await testSseBtn.click();
    await expect(page.locator('[data-testid="sse-status-badge"]')).toContainText('SSE Connected');

    // 6. Test IndexedDB Offline Intake Storage
    const testStorageBtn = page.locator('[data-testid="btn-test-storage"]');
    await testStorageBtn.click();
    await expect(page.locator('[data-testid="storage-status-badge"]')).toContainText('IndexedDB Active');

    // 7. Verify All Systems Operational Badge
    const allSystemsBadge = page.locator('[data-testid="all-systems-operational-badge"]');
    await expect(allSystemsBadge).toBeVisible();
    await expect(allSystemsBadge).toContainText('All 4 Subsystems Operational');

    // 8. Close Diagnostics Modal
    await page.locator('[data-testid="btn-close-diagnostics"]').click();
    await expect(diagContainer).not.toBeVisible();
  });

  test('18.3 Clinic Admin Portal: Hardware Diagnostics integrates into top navbar and executes full batch self-test', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // 1. Log in as Clinic Admin
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });

    // 2. Open Diagnostics from Admin Header
    const adminDiagBtn = page.locator('[data-testid="btn-hardware-diagnostics"]');
    await expect(adminDiagBtn).toBeVisible();
    await adminDiagBtn.click();

    // 3. Run Full Diagnostics Batch Suite
    const runAllBtn = page.locator('[data-testid="btn-run-all-diagnostics"]');
    await expect(runAllBtn).toBeVisible();
    await runAllBtn.click();

    // 4. Verify all 4 subsystems pass and operational badge appears
    await expect(page.locator('[data-testid="all-systems-operational-badge"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="printer-status-badge"]')).toContainText('ESC/POS Driver Ready');
    await expect(page.locator('[data-testid="audio-status-badge"]')).toContainText('Audio Engine Ready');
    await expect(page.locator('[data-testid="sse-status-badge"]')).toContainText('SSE Connected');
    await expect(page.locator('[data-testid="storage-status-badge"]')).toContainText('IndexedDB Active');

    // Close Modal
    await page.locator('[data-testid="btn-close-diagnostics"]').click();
  });

  test('18.4 Backend REST APIs: /api/v1/hardware endpoints validate system health, ESC/POS format, and audio synthesis', async ({
    request,
  }) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

    // 1. GET /api/v1/hardware/diagnostics
    const diagRes = await request.get(`${apiBase}/api/v1/hardware/diagnostics`);
    expect(diagRes.status()).toBe(200);
    const diagData = await diagRes.json();
    expect(diagData.status).toBe('OPERATIONAL');
    expect(diagData.subsystems.thermalPrinter.status).toBe('ONLINE');
    expect(diagData.subsystems.thermalPrinter.supportedPaperWidthMm).toBe(80);
    expect(diagData.subsystems.waitingRoomAudio.status).toBe('ONLINE');
    expect(diagData.subsystems.realtimeStreaming.status).toBe('ONLINE');
    expect(diagData.subsystems.offlinePwaStorage.status).toBe('ONLINE');

    // 2. POST /api/v1/hardware/printer-test
    const printerRes = await request.post(`${apiBase}/api/v1/hardware/printer-test`, {
      data: {
        clinicName: 'Bhopal City Care Polyclinic',
        chamberNumber: 'CH-2',
        doctorName: 'Dr. Priya Patel',
      },
    });
    expect(printerRes.status()).toBe(200);
    const printerData = await printerRes.json();
    expect(printerData.success).toBe(true);
    expect(printerData.bytesDispatched).toBe(312);
    expect(printerData.format).toBe('ESC/POS 80mm Thermal Receipt');
    expect(printerData.sampleToken.chamberNumber).toBe('CH-2');

    // 3. POST /api/v1/hardware/audio-ping
    const audioRes = await request.post(`${apiBase}/api/v1/hardware/audio-ping`);
    expect(audioRes.status()).toBe(200);
    const audioData = await audioRes.json();
    expect(audioData.success).toBe(true);
    expect(audioData.chime).toBe('DUAL_TONE_440_880_HZ');
    expect(audioData.ttsPhrase).toContain('Chamber 1');
  });
});

