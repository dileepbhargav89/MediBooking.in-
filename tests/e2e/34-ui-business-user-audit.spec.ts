import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test.describe('Multi-Perspective UI, Business & User Specific Enhancements Audit', () => {
  test('34.1 Marketplace Sorting, Available Today Filter, and WhatsApp Sharing', async ({ page }) => {
    await page.goto('/doctors');

    // 1. Check Sort By dropdown
    const sortSelect = page.locator('select[data-testid="select-sort-by"]');
    await expect(sortSelect).toBeVisible();
    await sortSelect.selectOption('FEE_LOW');

    // Lowest fee doctors should appear at the top (e.g. ₹500 doctors like Dr. Vivek Saxena / Dr. Rohit Chouhan)
    await expect(page.getByText('₹500').first()).toBeVisible();

    // 2. Check Available Today filter
    const availableTodayBtn = page.getByRole('button', { name: /Available Today/i });
    await expect(availableTodayBtn).toBeVisible();
    await availableTodayBtn.click();
    await expect(page.getByText('🟢 Today Only')).toBeVisible();

    // 3. Check WhatsApp Share link presence
    const shareLinks = page.locator('a[title="Share on WhatsApp"]');
    await expect(shareLinks.first()).toBeVisible();
  });

  test('34.2 Doctor Profile Bilingual Labels, 100% Refund Guarantee & WhatsApp Family Share', async ({ page }) => {
    await page.goto('/dr/dr-rajesh-sharma-cardio');

    // Open booking modal
    const slotButton = page.locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM/i }).first();
    await slotButton.click();

    // Verify bilingual Hindi labels for Ramesh
    await expect(page.getByText('मरीज़ का पूरा नाम')).toBeVisible();
    await expect(page.getByText('व्हाट्सएप नंबर')).toBeVisible();

    // Verify 100% Refund Guarantee
    await expect(page.getByText('100% Refund Guarantee')).toBeVisible();

    // Fill booking details
    await page.fill('input[data-testid="input-patient-name"]', 'Ramesh Kumar');
    await page.fill('input[data-testid="input-patient-mobile"]', '9826012345');

    // Confirm booking
    await page.click('button[data-testid="btn-pay-booking-fee"]');

    // Verify confirmation and WhatsApp family share link
    await expect(page.locator('text=Appointment Confirmed')).toBeVisible();
    await expect(page.locator('text=Share Token with Family on WhatsApp')).toBeVisible();
  });

  test('34.3 Patient Live Tracker Directions Link and Visual Capture', async ({ page }) => {
    await page.goto('/patient?token=14&chamber=CH-1&doctor=Dr.%20Rajesh%20Sharma&clinic=CityCare%20Polyclinic&patient=Ramesh%20Kumar');

    // Verify directions link
    await expect(page.getByText('Get Directions (दिशा निर्देश)')).toBeVisible();
    await expect(page.getByTestId('assigned-token-number')).toContainText('#14');
    await expect(page.getByText('CH-1').first()).toBeVisible();

    // Capture visual artifacts
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-36-enhanced-patient-tracker.png'),
      fullPage: true,
    });
  });
});
