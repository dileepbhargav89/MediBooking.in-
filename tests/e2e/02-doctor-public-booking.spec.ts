import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 2: Doctor Public Profile & Chamber Booking', () => {
  test('2.1 Doctor Profile loads with NMC verification badge and polyclinic affiliations', async ({ page }) => {
    await page.goto('/dr/dr-rajesh-sharma-cardio');

    await expect(page.locator('h1')).toContainText('Dr. Rajesh Sharma');
    await expect(page.locator('text=Verified Practitioner')).toBeVisible();
    await expect(page.locator('text=NMC: MP-38492').first()).toBeVisible();
    await expect(page.locator('text=Cardiology').first()).toBeVisible();
    await expect(page.locator('text=Bhopal City Care').first()).toBeVisible();
  });

  test('2.2 Patient selects available time slot, reserves slot with lock timer, and confirms intake', async ({ page }) => {
    await page.goto('/dr/dr-rajesh-sharma-cardio');

    // Select an evening slot
    const slotButton = page.locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM/i }).first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // Verify slot lock timer is activated
    await expect(page.locator('text=Slot held exclusively for you')).toBeVisible();

    // Fill in patient booking details
    await page.fill('input[placeholder*="Ramesh Kumar"]', 'Vikramaditya Rao');
    await page.fill('input[placeholder*="98260"]', '9826098765');

    // Click Confirm & Reserve button
    const confirmBtn = page.locator('button', { hasText: /Confirm Appointment/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify confirmed token issuance card
    await expect(page.locator('text=Appointment Confirmed')).toBeVisible();
    await expect(page.getByText('CH-1').first()).toBeVisible();
    await expect(page.locator('text=Vikramaditya Rao')).toBeVisible();
  });
});
