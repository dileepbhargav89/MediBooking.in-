import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 6: Clinic Admin & Super Admin Portals', () => {
  test('6.1 Clinic Administrator verifies affiliations, EOD shift close, and subscription tier', async ({ page }) => {
    // Authenticate as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin');

    await expect(page.locator('header')).toContainText('Clinic Administrator Portal');
    await expect(page.locator('text=Affiliated Doctors')).toBeVisible();

    // Switch to End-of-Day Cash Drawer Reconciliation Tab
    const cashTab = page.locator('button', { hasText: /End-of-Day Cash Drawer Reconciliation/i });
    await expect(cashTab).toBeVisible();
    await cashTab.click();

    await expect(page.locator('text=System Expected Cash')).toBeVisible();

    // Verify Lock Shift button is present
    const lockBtn = page.locator('button', { hasText: /Lock Shift/i });
    await expect(lockBtn).toBeVisible();

    // Switch to SaaS Subscription Tab
    const billingTab = page.locator('button', { hasText: /SaaS Subscription Billing/i });
    await expect(billingTab).toBeVisible();
    await billingTab.click();

    await expect(page.locator('text=Clinic Pro Plan Entitlements')).toBeVisible();
  });

  test('6.2 Super Admin verifies NMC Credentials, Polyclinic Tenants, and DPDP Audit Chain', async ({ page }) => {
    // Authenticate as Super Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin');

    await expect(page.locator('header')).toContainText('Super Admin Platform Console');
    await expect(page.locator('text=Active Polyclinic Tenants')).toBeVisible();
    await expect(page.locator('text=DPDP Audit Blocks').first()).toBeVisible();

    // Verify Doctor NMC verification queue
    await expect(page.locator('text=/Doctor NMC Verification/i').first()).toBeVisible();
  });
});
