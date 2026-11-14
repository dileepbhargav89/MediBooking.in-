import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 6 Multi-Perspective Audit: Super Admin Multi-Clinic BI & SaaS Engine', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    // Authenticate as Super Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 15000 });
  });

  test('39.1 Network-Wide Multi-Clinic OPD Command Center (/super-admin -> SAAS_BI)', async ({ page }) => {
    // 1. Click sidebar link for Network OPD & 80/20 Revenue
    const saasBiBtn = page.getByTestId('sidebar-btn-saas-bi');
    await expect(saasBiBtn).toBeVisible();
    await saasBiBtn.click();

    // 2. Verify Command Center Header & Status
    const commandCenter = page.getByTestId('network-opd-command-center');
    await expect(commandCenter).toBeVisible();
    await expect(commandCenter.locator('text=Network-Wide OPD Command Center & SaaS Engine')).toBeVisible();
    await expect(commandCenter.locator('text=● LIVE CLUSTER SYNC')).toBeVisible();

    // 3. Verify 4 Multi-Clinic OPD Velocity KPI Cards
    const clinicsLive = page.getByTestId('metric-clinics-live');
    await expect(clinicsLive).toBeVisible();
    await expect(clinicsLive).toContainText('10 / 10 Clinics Live');

    const activeChambers = page.getByTestId('metric-active-chambers');
    await expect(activeChambers).toBeVisible();
    await expect(activeChambers).toContainText('32 / 37 Active Chambers');

    const consultationsToday = page.getByTestId('metric-consultations-today');
    await expect(consultationsToday).toBeVisible();
    await expect(consultationsToday).toContainText('248 Consultations');

    const avgWaitTime = page.getByTestId('metric-avg-wait-time');
    await expect(avgWaitTime).toBeVisible();
    await expect(avgWaitTime).toContainText('14 mins');

    const totalRevenue = page.getByTestId('metric-total-revenue');
    await expect(totalRevenue).toBeVisible();
    await expect(totalRevenue).toContainText('₹1,48,800');

    const split = page.getByTestId('metric-collections-split');
    await expect(split).toBeVisible();
    await expect(split).toContainText('Cash ₹59,520 (40%)');
    await expect(split).toContainText('UPI ₹89,280 (60%)');

    // 4. Capture Visual Screenshot Artifact
    await page.screenshot({
      path: path.join(artifactDir, 'qa-53-superadmin-network-opd-metrics.png'),
      fullPage: true,
    });
  });

  test('39.2 Automated Doctor Revenue Ledger & 80/20 Batch NEFT CMS Payout Disbursal', async ({ page }) => {
    // 1. Navigate to SAAS_BI tab
    await page.getByTestId('sidebar-btn-saas-bi').click();

    // 2. Verify Doctor Revenue Ledger Section
    const ledgerSection = page.getByTestId('doctor-revenue-ledger-section');
    await expect(ledgerSection).toBeVisible();
    await expect(ledgerSection.locator('text=Automated Doctor Revenue Ledger & 80/20 Payout Disbursal')).toBeVisible();

    // Verify Doctor Records (Dr. Rajesh Sharma & Dr. Priya Patel)
    await expect(ledgerSection.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(ledgerSection.locator('text=Bhopal City Care Polyclinic').first()).toBeVisible();
    await expect(ledgerSection.locator('text=₹14,400').first()).toBeVisible();
    await expect(ledgerSection.locator('text=₹11,520').first()).toBeVisible();
    await expect(ledgerSection.locator('text=₹10,368').first()).toBeVisible();
    await expect(ledgerSection.locator('text=HDFC Bank •••• 4819').first()).toBeVisible();

    await expect(ledgerSection.locator('text=Dr. Priya Patel').first()).toBeVisible();
    await expect(ledgerSection.locator('text=₹10,800').first()).toBeVisible();
    await expect(ledgerSection.locator('text=₹7,776').first()).toBeVisible();

    // 3. Trigger Batch NEFT Disbursal
    const disburseBtn = page.getByTestId('batch-disburse-btn');
    await expect(disburseBtn).toBeVisible();
    await disburseBtn.click();

    // 4. Verify Payout Success Alert Banner & File Generation
    const successBanner = page.getByTestId('payout-success-banner');
    await expect(successBanner).toBeVisible();
    await expect(successBanner.locator('text=Bank NEFT CMS Batch Payout Disbursal Executed Successfully')).toBeVisible();
    await expect(successBanner.locator('text=₹29,664')).toBeVisible();
    await expect(successBanner.locator('text=CMS File:')).toBeVisible();

    const downloadBtn = page.getByTestId('download-cms-file-btn');
    await expect(downloadBtn).toBeVisible();

    // Verify status updated to DISBURSED
    await expect(ledgerSection.locator('text=✓ DISBURSED').first()).toBeVisible();

    // 5. Capture Visual Screenshot Artifact
    await page.screenshot({
      path: path.join(artifactDir, 'qa-54-superadmin-doctor-revenue-ledger.png'),
      fullPage: true,
    });
  });

  test('39.3 Chamber Idle Time Minimization Heatmap & Sublease Optimization', async ({ page }) => {
    // 1. Navigate to SAAS_BI tab
    await page.getByTestId('sidebar-btn-saas-bi').click();

    // 2. Verify Chamber Heatmaps Section
    const chamberSection = page.getByTestId('chamber-utilization-section');
    await expect(chamberSection).toBeVisible();
    await expect(chamberSection.locator('text=Chamber Idle Time Minimization & Sublease Optimization')).toBeVisible();

    // 3. Verify Sublease Optimization Alert
    const idleAlert = page.getByTestId('chamber-idle-alert');
    await expect(idleAlert).toBeVisible();
    await expect(idleAlert.locator('text=Chamber CH-2 is vacant between 2:00 PM and 5:00 PM (14:00 - 17:00)')).toBeVisible();
    await expect(idleAlert.locator('text=₹18,000/month in idle facility revenue')).toBeVisible();

    // 4. Verify Chamber Rows (CH-1, CH-2, CH-3)
    await expect(chamberSection.getByText('CH-1', { exact: true })).toBeVisible();
    await expect(chamberSection.locator('text=Consultation Suite 1 (Cardiology)')).toBeVisible();
    await expect(chamberSection.locator('text=92%')).toBeVisible();

    await expect(chamberSection.getByText('CH-2', { exact: true })).toBeVisible();
    await expect(chamberSection.locator('text=Consultation Suite 2 (Multi-Specialty)')).toBeVisible();
    await expect(chamberSection.locator('text=58%')).toBeVisible();

    await expect(chamberSection.getByText('CH-3', { exact: true })).toBeVisible();
    await expect(chamberSection.locator('text=Dermatology & Cosmetology Suite')).toBeVisible();
    await expect(chamberSection.locator('text=85%')).toBeVisible();

    // 5. Capture Visual Screenshot Artifact
    await page.screenshot({
      path: path.join(artifactDir, 'qa-55-superadmin-chamber-idle-heatmap.png'),
      fullPage: true,
    });
  });

  test('39.4 Section 194J Quarterly TDS Tax Compliance & Form 16A Generator', async ({ page }) => {
    // 1. Navigate to SAAS_BI tab
    await page.getByTestId('sidebar-btn-saas-bi').click();

    // 2. Verify Section 194J Tax Section
    const taxSection = page.getByTestId('section-194j-tax-section');
    await expect(taxSection).toBeVisible();
    await expect(taxSection.locator('text=Section 194J Quarterly TDS Tax Compliance (Form 16A)')).toBeVisible();

    // Verify Tax Summary Cards
    await expect(taxSection.locator('text=FY 2026-27 (Q3)')).toBeVisible();
    await expect(taxSection.locator('text=BPLM01294F')).toBeVisible();
    await expect(taxSection.locator('text=₹12,45,000')).toBeVisible();
    await expect(taxSection.locator('text=₹1,24,500')).toBeVisible();
    await expect(taxSection.locator('text=✓ COMPLIANT')).toBeVisible();

    // 3. Click Generate Form 16A ZIP Button
    const genBtn = page.getByTestId('generate-form16a-btn');
    await expect(genBtn).toBeVisible();
    await genBtn.click();

    // 4. Verify Generated Notice Banner
    const generatedBanner = page.getByTestId('form16a-generated-banner');
    await expect(generatedBanner).toBeVisible();
    await expect(generatedBanner).toContainText('Form 16A TDS Certificates (38 Doctors) & ITNS-281 Challan Batch Zip Generated Successfully');

    // 5. Capture Visual Screenshot Artifact
    await page.screenshot({
      path: path.join(artifactDir, 'qa-56-superadmin-section-194j-tds-report.png'),
      fullPage: true,
    });
  });
});
