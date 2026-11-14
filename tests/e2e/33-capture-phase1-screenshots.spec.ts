import { test } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test.describe('Capture Phase 1 Visual Artifacts', () => {
  test('Capture Homepage, Marketplace, and Doctor Profile with Symptoms', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Capture Homepage with Symptom Search
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const searchInput = page.locator('input[data-testid="home-search-input"]');
    await searchInput.fill('chest heaviness');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-33-homepage-symptom-search.png'),
      fullPage: true,
    });

    // 2. Capture Marketplace /doctors Catalog
    await page.goto('/doctors');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-34-doctors-marketplace.png'),
      fullPage: true,
    });

    // 3. Capture Doctor Profile with Treated Symptoms and DPDP Consent Modal
    await page.goto('/dr/dr-rajesh-sharma-cardio');
    await page.waitForTimeout(600);
    // Open booking modal
    const slotButton = page.locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM/i }).first();
    await slotButton.click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-35-doctor-profile-symptoms.png'),
      fullPage: false,
    });
  });
});

