import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('E2E Workflow 30: Admin & Super Admin Left-Sidebar Layout and Data Views', () => {
  test('30.1 Clinic Admin Left Sidebar: Navigate Clinic, Chambers, Doctors, Patients, Cash Drawer, Settlements, and Billing', async ({ page }) => {
    test.setTimeout(60000);
    const screenshotDir = path.join(process.cwd(), 'playwright-report');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Login as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 30000 });

    // 1. Verify Header & Sidebar Branding
    await expect(page.locator('header')).toContainText('Clinic Administrator Portal');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toContainText('Bhopal City Care');
    await expect(sidebar).toContainText('MP Nagar Zone II');

    // 2. Default View: Clinic Overview & Chambers
    await expect(page.locator('text=Chamber Status & Live Queue Intake')).toBeVisible();
    await expect(page.getByText('CH-1', { exact: true })).toBeVisible();
    await expect(page.getByText('CH-4', { exact: true })).toBeVisible();

    // 3. Navigate to Patients & Queue Intake
    const patientsBtn = sidebar.locator('button', { hasText: /Patients & Queue Intake/i });
    await expect(patientsBtn).toBeVisible();
    await patientsBtn.click();
    await expect(page.locator("text=Today's Patient Queue Intake Ledger")).toBeVisible();
    await expect(page.locator('text=Ramesh Patel')).toBeVisible();
    await expect(page.locator('text=VITALS RECORDED').first()).toBeVisible();

    // 4. Navigate to Doctor Affiliations
    const affBtn = sidebar.locator('button', { hasText: /Doctor Affiliations/i });
    await expect(affBtn).toBeVisible();
    await affBtn.click();
    await expect(page.locator('text=Clinic-Doctor Affiliation & Differential Fee Matrix')).toBeVisible();
    await expect(page.locator('text=Dr. Rajesh Sharma')).toBeVisible();
    await expect(page.locator('text=Dr. Sunita Rao')).toBeVisible();

    // 5. Navigate to Cash Drawer Reconciliation
    const cashBtn = sidebar.locator('button', { hasText: /End-of-Day Cash Drawer Reconciliation/i });
    await expect(cashBtn).toBeVisible();
    await cashBtn.click();
    await expect(page.locator('text=Physical Cash Drawer')).toBeVisible();
    await expect(page.locator('text=System Expected Cash')).toBeVisible();
    await expect(page.locator('button', { hasText: /Lock Shift/i })).toBeVisible();

    // 6. Navigate to Doctor Revenue Split & NEFT Ledger
    const settlementsBtn = sidebar.locator('button', { hasText: /Doctor Revenue Split & NEFT Ledger/i });
    await expect(settlementsBtn).toBeVisible();
    await settlementsBtn.click();
    await expect(page.locator('text=Daily Doctor Payout Ledger & Section 194J Compliance')).toBeVisible();
    await expect(page.locator('text=Export NEFT CMS Batch')).toBeVisible();

    // 7. Navigate to SaaS Subscription Billing
    const billingBtn = sidebar.locator('button', { hasText: /SaaS Subscription Billing/i });
    await expect(billingBtn).toBeVisible();
    await billingBtn.click();
    await expect(page.locator('text=Clinic Pro Plan Entitlements')).toBeVisible();

    // Take screenshot of Clinic Admin with Sidebar
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'qa-21-improved-admin-sidebar.png'), fullPage: true });
  });

  test('30.2 Super Admin Left Sidebar: Navigate Overview, 10 Tenants, Doctor NMC, Patient Directory, DPDP Chain, and Telemetry', async ({ page }) => {
    test.setTimeout(60000);
    const screenshotDir = path.join(process.cwd(), 'playwright-report');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Login as Super Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 30000 });

    // 1. Verify Header & Sidebar Branding
    await expect(page.locator('header')).toContainText('Super Admin Platform Console');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toContainText('MediBooking.in Platform HQ');

    // 2. Default View: Doctor NMC Verification Desk
    await expect(page.locator('text=National Medical Commission (NMC) Verification Registry')).toBeVisible();
    await expect(page.locator('text=Dr. Rajesh Sharma')).toBeVisible();
    await expect(page.locator('text=Dr. Vikramaditya Singh')).toBeVisible();

    // 3. Navigate to Platform Master Overview
    const overviewBtn = sidebar.locator('button', { hasText: /Platform Master Overview/i });
    await expect(overviewBtn).toBeVisible();
    await overviewBtn.click();
    await expect(page.locator('text=Bhopal Polyclinic SaaS Pilot Network')).toBeVisible();
    await expect(page.locator('text=MP Nagar Zone II & I')).toBeVisible();

    // 4. Navigate to Active Polyclinic Tenants (10 Clinics)
    const tenantsBtn = sidebar.locator('button', { hasText: /Polyclinic Tenants/i });
    await expect(tenantsBtn).toBeVisible();
    await tenantsBtn.click();
    await expect(page.locator('text=Active Polyclinic Tenants in Bhopal')).toBeVisible();
    await expect(page.locator('text=Bhopal City Care Polyclinic')).toBeVisible();
    await expect(page.locator('text=Arera Super Specialty Polyclinic')).toBeVisible();
    await expect(page.locator('text=Lalghati Specialist Clinic')).toBeVisible();

    // 5. Navigate to Patients & DPDP Directory
    const patientsBtn = sidebar.locator('button', { hasText: /Patients & DPDP Directory/i });
    await expect(patientsBtn).toBeVisible();
    await patientsBtn.click();
    await expect(page.locator('text=Platform Patient Master Directory & DPDP Consent Vault')).toBeVisible();
    await expect(page.locator('text=Ramesh Patel')).toBeVisible();
    await expect(page.locator('text=✓ ABHA LINKED').first()).toBeVisible();

    // 6. Navigate to DPDP Audit Chain
    const dpdpBtn = sidebar.locator('button', { hasText: /DPDP Act 2023 Immutable Audit Chain/i });
    await expect(dpdpBtn).toBeVisible();
    await dpdpBtn.click();
    await expect(page.locator('text=DPDP Act 2023 Cryptographic Audit Ledger')).toBeVisible();
    await expect(page.locator('text=Block #1,420')).toBeVisible();

    // 7. Navigate to Telemetry
    const telemetryBtn = sidebar.locator('button', { hasText: /Gateway Telemetry/i });
    await expect(telemetryBtn).toBeVisible();
    await telemetryBtn.click();
    await expect(page.locator('text=Meta WhatsApp Cloud API')).toBeVisible();
    await expect(page.locator('text=TRAI DLT SMS Gateway Broker')).toBeVisible();

    // Take screenshot of Super Admin with Sidebar
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'qa-22-improved-super-admin-sidebar.png'), fullPage: true });
  });
});
