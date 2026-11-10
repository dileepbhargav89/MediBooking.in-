import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DILEEP BHARGAV\\.gemini\\antigravity\\brain\\3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test('Capture Register Page UI', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/register', { waitUntil: 'networkidle' });
  await expect(page.locator('h2')).toContainText('Patient & Family Registration');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa-18-patient-register-screen.png'), fullPage: false });
});
