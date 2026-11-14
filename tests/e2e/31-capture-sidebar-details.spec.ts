import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Capture Sidebar Views Detail', () => {
  test('Capture Clinic Admin Chambers & Patients and Super Admin Tenants & NMC Desk', async ({ page }) => {
    test.setTimeout(60000);
    const screenshotDir = path.join(process.cwd(), 'playwright-report');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 1. Clinic Admin - Chambers Overview
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 30000 });
    const sidebar = page.locator('aside');
    await sidebar.locator('button', { hasText: /Clinic & Chambers/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, 'qa-23-admin-chambers-overview.png'), fullPage: true });

    // 2. Clinic Admin - Patients & Queue Intake
    await sidebar.locator('button', { hasText: /Patients & Queue Intake/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, 'qa-24-admin-patients-queue.png'), fullPage: true });

    // 3. Super Admin - Tenants List
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 30000 });
    const superSidebar = page.locator('aside');
    await superSidebar.locator('button', { hasText: /Polyclinic Tenants/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, 'qa-25-superadmin-tenants-list.png'), fullPage: true });

    // 4. Super Admin - NMC Desk
    await superSidebar.locator('button', { hasText: /Doctor NMC Verification Desk/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, 'qa-26-superadmin-nmc-desk.png'), fullPage: true });
  });
});

