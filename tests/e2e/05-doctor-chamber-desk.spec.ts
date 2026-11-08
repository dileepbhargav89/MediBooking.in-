import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 5: Doctor Chamber Consultation Desk Glance Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 15000 });
  });

  test('5.1 Consultation glance desk renders doctor details, current patient vitals, and queue', async ({ page }) => {
    await expect(page.locator('header')).toContainText('Dr. Rajesh Sharma');
    await expect(page.locator('text=Blood Pressure')).toBeVisible();
    await expect(page.locator('text=Pulse Rate')).toBeVisible();

    // Check action buttons
    await expect(page.locator('button', { hasText: /Complete & Call Next Token/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /Issue 14-Day Free Follow-Up/i })).toBeVisible();
    await expect(page.locator('text=1-Click Delay Broadcast')).toBeVisible();
  });

  test('5.2 Doctor types quick prescription note and completes consultation', async ({ page }) => {
    // Quick Rx notes field
    const rxTextarea = page.locator('textarea').first();
    if (await rxTextarea.isVisible()) {
      await rxTextarea.fill('Tab Amlodipine 5mg OD x 14 days. Avoid high sodium.');
      await expect(rxTextarea).toHaveValue(/Amlodipine/);
    }

    // Click Complete & Call Next Token
    const completeBtn = page.locator('button', { hasText: /Complete & Call Next Token/i });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    // Verify success banner appears
    await expect(page.locator('text=/Completed!/i')).toBeVisible();
  });
});
