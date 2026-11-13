import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Capture Current Admin & Super Admin Portals', () => {
  test('Capture current /admin and /super-admin portal state', async ({ page }) => {
    test.setTimeout(60000);
    const screenshotDir = path.join(process.cwd(), 'playwright-report');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 1. Capture /admin (Clinic Admin)
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'qa-19-current-admin-portal.png'), fullPage: true });

    // 2. Capture /super-admin (Super Admin)
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'qa-20-current-super-admin-portal.png'), fullPage: true });
  });
});
