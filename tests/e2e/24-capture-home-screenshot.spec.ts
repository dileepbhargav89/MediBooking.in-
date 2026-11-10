import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\DILEEP BHARGAV\\.gemini\\antigravity\\brain\\3156ef61-eedf-40f0-bde3-ad9cf6b39876';
const SCREENSHOT_PATH = path.join(ARTIFACT_DIR, 'qa-12-improved-home-page.png');

test('Capture Improved Home Page UI Screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/', { waitUntil: 'networkidle' });

  // Wait for elements to be visible
  await expect(page.locator('text=Instant Doctor Appointments')).toBeVisible();
  await expect(page.locator('text=Live Waiting Room Tracker')).toBeVisible();

  // Take screenshot of above the fold and top half
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  console.log('Saved screenshot to:', SCREENSHOT_PATH);
});
