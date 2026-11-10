import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DILEEP BHARGAV\\.gemini\\antigravity\\brain\\3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test('Capture Login Page Initial Screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/login', { waitUntil: 'networkidle' });
  await expect(page.locator('h2')).toContainText('Single Sign-On Clinic Portal');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa-13-current-login-page.png'), fullPage: false });
});

