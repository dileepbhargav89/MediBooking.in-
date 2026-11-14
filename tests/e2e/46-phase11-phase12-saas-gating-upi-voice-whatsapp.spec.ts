import { test, expect } from '@playwright/test';
import path from 'path';

const artifactDir = 'C:\\Users\\DILEEP BHARGAV\\.gemini\\antigravity\\brain\\3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test.describe('Phase 11 & Phase 12: Dynamic SaaS Chamber Quota Gating, Instant UPI Payouts, Voice Search & WhatsApp Pass', () => {

  // 1. PHASE 11 PART A: CLINIC ADMIN SAAS CHAMBER QUOTA GATING
  test('46.1 Clinic Admin: Dynamic Chamber Quota Intercept & 1-Click Upgrade to Enterprise', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 15000 });

    // Step B: Verify Clinic Overview Tab & Active 4 Chambers on Clinic Pro
    const overviewHeading = page.locator('h3', { hasText: /Chamber Status & Live Queue Intake/i });
    await expect(overviewHeading).toBeVisible();

    // Verify Add Chamber Button
    const addChamberBtn = page.getByTestId('btn-add-chamber');
    await expect(addChamberBtn).toBeVisible();
    await addChamberBtn.click();

    // Verify Quota Intercept Modal
    const quotaModal = page.getByTestId('modal-chamber-quota-exceeded');
    await expect(quotaModal).toBeVisible();
    await expect(quotaModal.locator('text=Quota Cap Reached: 4 of 4 Chambers in Use')).toBeVisible();
    await expect(quotaModal.locator('text=Polyclinic Enterprise').first()).toBeVisible();

    // Step C: Trigger 1-Click Upgrade to Enterprise & Provision CH-5
    const upgradeBtn = page.getByTestId('btn-quota-upgrade-enterprise');
    await expect(upgradeBtn).toBeVisible();
    await upgradeBtn.click();

    // Verify modal closes and confirmation toast appears
    await expect(quotaModal).toBeHidden();
    const addedToast = page.getByTestId('toast-chamber-added');
    await expect(addedToast).toBeVisible();
    await expect(addedToast).toContainText('Upgraded to Polyclinic Enterprise! Chamber CH-5 provisioned');

    // Verify Chamber 5 Card is now rendered in the grid
    const chamber5Card = page.getByTestId('chamber-card-ch-5');
    await expect(chamber5Card).toBeVisible();
    await expect(chamber5Card.locator('text=Dr. Alok Mathur')).toBeVisible();
    await expect(chamber5Card.locator('text=CH-5')).toBeVisible();

    // Capture visual screenshot artifact
    await page.screenshot({
      path: path.join(artifactDir, 'qa-69-admin-saas-quota-gating-enterprise.png'),
      fullPage: true,
    });
  });

  // 2. PHASE 11 PART B: SUPER ADMIN INSTANT 24x7 UPI DISBURSAL VIA RAZORPAYX
  test('46.2 Super Admin: Instant 24x7 UPI Disbursal to Doctor VPA with NPCI RRN', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Super Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 15000 });

    // Step B: Navigate to SAAS_BI Tab
    await page.getByTestId('sidebar-btn-saas-bi').click();

    // Verify Doctor Revenue Ledger section
    const ledgerSection = page.getByTestId('doctor-revenue-ledger-section');
    await expect(ledgerSection).toBeVisible();

    // Verify Instant UPI Disburse Button
    const instantUpiBtn = page.getByTestId('instant-upi-disburse-btn');
    await expect(instantUpiBtn).toBeVisible();
    await instantUpiBtn.click();

    // Verify UPI Payout Success Banner
    const upiBanner = page.getByTestId('upi-payout-success-banner');
    await expect(upiBanner).toBeVisible({ timeout: 10000 });
    await expect(upiBanner.locator('text=Instant UPI Payout Disbursal Confirmed')).toBeVisible();
    await expect(upiBanner.locator('text=NPCI RRN:')).toBeVisible();

    // Verify status updated to SETTLED (UPI)
    const settledUpiPill = page.locator('span', { hasText: /SETTLED \(UPI\)/i }).first();
    await expect(settledUpiPill).toBeVisible();

    // Capture visual screenshot artifact
    await page.screenshot({
      path: path.join(artifactDir, 'qa-70-superadmin-instant-upi-payout.png'),
      fullPage: true,
    });
  });

  // 3. PHASE 12 PART A: VOICE-ASSISTED BILINGUAL SYMPTOM SEARCH
  test('46.3 Public Discovery: Voice-Assisted Bilingual Symptom Search (Hindi / English)', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Visit Public Home Page
    await page.goto('/');

    const searchInput = page.getByTestId('home-search-input');
    await expect(searchInput).toBeVisible();

    // Verify Voice Controls
    const langToggleBtn = page.getByTestId('btn-voice-lang-toggle');
    const voiceSearchBtn = page.getByTestId('btn-voice-search');
    await expect(langToggleBtn).toBeVisible();
    await expect(voiceSearchBtn).toBeVisible();

    // Toggle Language to English and back to Hindi
    await langToggleBtn.click();
    await expect(langToggleBtn).toContainText('EN');
    await langToggleBtn.click();
    await expect(langToggleBtn).toContainText('हिन्दी');

    // Click Voice Search
    await voiceSearchBtn.click();

    // Verify search input receives voice transcript and triggers triage alert
    await expect(searchInput).not.toHaveValue('', { timeout: 10000 });
    const emergencyNotice = page.locator('text=Emergency Alert');
    await expect(emergencyNotice).toBeVisible();
    await expect(page.locator('text=108 Ambulance')).toBeVisible();

    // Capture visual screenshot artifact
    await page.screenshot({
      path: path.join(artifactDir, 'qa-71-patient-voice-bilingual-symptom-search.png'),
      fullPage: true,
    });
  });

  // 4. PHASE 12 PART B: PATIENT UNIFIED HUB WHATSAPP LIVE QUEUE PASS
  test('46.4 Patient Portal: 1-Click WhatsApp Live Queue Pass with Instant Delivery Preview', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Navigate to Unified Patient Dashboard
    await page.goto('/patient/dashboard');
    await expect(page.locator('h1', { hasText: /Family Healthcare Hub/i })).toBeVisible();

    // Step B: Switch to LIVE_QUEUE Tab
    const queueTab = page.getByTestId('tab-btn-queue');
    await expect(queueTab).toBeVisible();
    await queueTab.click();

    // Verify Live Queue Section
    const queueSection = page.getByTestId('section-live-queue');
    await expect(queueSection).toBeVisible();
    await expect(page.getByTestId('live-token-number')).toHaveText('#14');

    // Step C: Trigger 1-Click WhatsApp Pass
    const whatsAppBtn = page.getByTestId('btn-whatsapp-pass');
    await expect(whatsAppBtn).toBeVisible();
    await whatsAppBtn.scrollIntoViewIfNeeded();
    await whatsAppBtn.click();

    // Verify WhatsApp Sent Toast & Card Preview
    const whatsAppToast = page.getByTestId('toast-whatsapp-sent');
    await expect(whatsAppToast).toBeVisible();
    await expect(whatsAppToast.locator('text=Live Queue Pass Sent to WhatsApp')).toBeVisible();
    await expect(whatsAppToast.locator('text=+91 98260-11111')).toBeVisible();

    const previewCard = page.getByTestId('card-whatsapp-pass-preview');
    await expect(previewCard).toBeVisible();
    await expect(previewCard).toContainText('Bhopal City Care Polyclinic • Live Token Pass');
    await expect(previewCard).toContainText('Token: #14');

    // Capture visual screenshot artifact
    await page.screenshot({
      path: path.join(artifactDir, 'qa-72-patient-whatsapp-live-queue-pass.png'),
      fullPage: true,
    });
  });
});
