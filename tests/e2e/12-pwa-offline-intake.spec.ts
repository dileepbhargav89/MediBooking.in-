import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 12 (Phase 53): Front-Desk PWA Offline Service Worker & IndexedDB Queue', () => {
  test.describe('Browser UI Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Authenticate as Receptionist via pilot quick-login
      await page.context().clearCookies();
      await page.goto('http://localhost:3000/login');
      await page.locator('button', { hasText: 'Reception Desk' }).click();
      await page.locator('button', { hasText: /Instant Dev Login/i }).click();
      await expect(page).toHaveURL(/.*\/receptionist/, { timeout: 10000 });
    });

    test('12.1 Receptionist enters simulated offline mode, issues walk-in token, and stores in local queue', async ({ page }) => {
      // Verify initial online connection status
      const statusPill = page.locator('text=Online (Synced)');
      await expect(statusPill).toBeVisible({ timeout: 10000 });

      // Toggle offline simulation mode
      const simulateOfflineBtn = page.locator('button', { hasText: /Simulate Offline/i });
      await expect(simulateOfflineBtn).toBeVisible();
      await simulateOfflineBtn.click();

      // Verify UI reflects Offline Mode
      const offlinePill = page.locator('text=/Offline Mode/i');
      await expect(offlinePill).toBeVisible();

      // Open Walk-In Intake Modal
      const walkInBtn = page.locator('button', { hasText: '+ Walk-In Intake' });
      await walkInBtn.click();
      await expect(page.locator('text=Rapid Walk-In Patient Intake')).toBeVisible();

      // Fill Form details
      await page.fill('input[placeholder="98260 12345"]', '9826055555');
      await page.fill('input[placeholder="e.g. Ramesh Kumar"]', 'Amit Offline Patient');

      // Submit Walk-In Intake
      const submitBtn = page.locator('button', { hasText: /Allocate Token & Generate Receipt/i });
      await submitBtn.click();

      // Receipt Modal should display successfully with provisional token
      await expect(page.getByRole('dialog').getByText('BHOPAL CITY CARE POLYCLINIC')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=TOKEN NUMBER')).toBeVisible();

      // Close receipt modal
      const doneBtn = page.locator('button', { hasText: 'Done' });
      await doneBtn.click();

      // Verify offline badge shows queued item
      await expect(page.locator('text=/Offline Mode/i')).toBeVisible();

      // Verify Sync Feedback banner is displayed
      await expect(page.locator('text=/saved to local offline storage/i')).toBeVisible();
    });

    test('12.2 Reconnecting restores online status and reconciles pending offline tokens with cloud backend', async ({ page }) => {
      // Switch to offline simulation and queue a token
      const simulateOfflineBtn = page.locator('button', { hasText: /Simulate Offline/i });
      if (await simulateOfflineBtn.isVisible()) {
        await simulateOfflineBtn.click();
      }

      const walkInBtn = page.locator('button', { hasText: '+ Walk-In Intake' });
      await walkInBtn.click();
      await expect(page.locator('text=Rapid Walk-In Patient Intake')).toBeVisible();

      await page.fill('input[placeholder="98260 12345"]', '9826066666');
      await page.fill('input[placeholder="e.g. Ramesh Kumar"]', 'Sunita Offline Sync');
      await page.locator('button', { hasText: /Allocate Token & Generate Receipt/i }).click();

      // Close Receipt Modal
      const doneBtn = page.locator('button', { hasText: 'Done' });
      await doneBtn.click();

      // Trigger Cloud Sync via "Sync Now" button
      const syncNowBtn = page.locator('button', { hasText: 'Sync Now' });
      await expect(syncNowBtn).toBeVisible();
      await syncNowBtn.click();

      // Verify cloud reconciliation notice
      await expect(page.locator('text=/Cloud Sync Reconciled/i')).toBeVisible({ timeout: 8000 });

      // Restore online state
      const reconnectBtn = page.locator('button', { hasText: /Reconnect/i });
      if (await reconnectBtn.isVisible()) {
        await reconnectBtn.click();
      }

      // Verify online synced badge restored
      await expect(page.locator('text=Online (Synced)')).toBeVisible({ timeout: 5000 });
    });
  });

  test('12.3 Backend REST API /api/v1/cashiering/sync-offline-batch handles batch ingestion & deduplication', async ({ request }) => {
    const timestamp = new Date().toISOString();
    const batchPayload = {
      clinicId: 'c1010000-0000-4000-8000-000000000001',
      batchRecords: [
        {
          id: `off-test-${Date.now()}-1`,
          idempotencyKey: `idemp-key-unique-1`,
          tokenNumber: 26,
          patientName: 'Kunal Verma',
          patientMobile: '9826077777',
          chamberNumber: 'CH-1',
          doctorName: 'Dr. Rajesh Sharma',
          paymentMode: 'PAID_CASH',
          feePaidRupees: 600,
          offlineGeneratedAt: timestamp,
        },
        {
          id: `off-test-${Date.now()}-2`,
          idempotencyKey: `idemp-key-unique-1`, // Duplicate idempotency key to test deduplication
          tokenNumber: 26,
          patientName: 'Kunal Verma (Retry)',
          patientMobile: '9826077777',
          chamberNumber: 'CH-1',
          doctorName: 'Dr. Rajesh Sharma',
          paymentMode: 'PAID_CASH',
          feePaidRupees: 600,
          offlineGeneratedAt: timestamp,
        },
        {
          id: `off-test-${Date.now()}-3`,
          idempotencyKey: `idemp-key-unique-2`,
          tokenNumber: 27,
          patientName: 'Radha Gupta',
          patientMobile: '9826088888',
          chamberNumber: 'CH-2',
          doctorName: 'Dr. Priya Patel',
          paymentMode: 'PAID_CASH',
          feePaidRupees: 500,
          offlineGeneratedAt: timestamp,
        },
      ],
    };

    const res = await request.post('http://127.0.0.1:4000/api/v1/cashiering/sync-offline-batch', {
      data: batchPayload,
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    // Deduplication should result in 2 reconciled tokens instead of 3
    expect(json.syncedCount).toBe(2);
    expect(json.reconciledTokens.length).toBe(2);
    expect(json.reconciledTokens[0].status).toBe('CONFIRMED');

    // Test Validation Failure with invalid payload
    const badRes = await request.post('http://127.0.0.1:4000/api/v1/cashiering/sync-offline-batch', {
      data: { invalidField: true },
    });
    expect(badRes.status()).toBe(400);
  });
});
