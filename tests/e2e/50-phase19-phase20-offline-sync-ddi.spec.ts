import { test, expect } from '@playwright/test';
import path from 'path';

const artifactDir = 'C:\\Users\\DILEEP BHARGAV\\.gemini\\antigravity\\brain\\3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test.describe('Phase 19 & Phase 20: Offline-First Local Sync Engine & Real-Time DDI / Pediatric Dosage Safety Shield', () => {

  test.beforeAll(async ({ request }) => {
    // Reset EMR Queue before test run to ensure clean baseline
    await request.post('http://127.0.0.1:4000/api/v1/emr/reset-queue');
  });

  // 1. PHASE 19: OFFLINE-FIRST LOCAL SYNC ENGINE & NETWORK RECOVERY
  test('50.1 Doctor Chamber: Offline-First Local Storage Engine & Simulated Network Drop Recovery', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/doctor/, { timeout: 30000 });

    // Step B: Navigate to Doctor Chamber
    await page.goto('/doctor/chamber');
    await expect(page).toHaveURL('/doctor/chamber');

    // Wait for active patient dossier
    const activeDossier = page.getByTestId('patient-dossier-card');
    await expect(activeDossier).toBeVisible({ timeout: 15000 });

    // Step C: Verify Initial Cloud Connected Network Status
    const networkStatus = page.getByTestId('badge-network-status');
    await expect(networkStatus).toBeVisible({ timeout: 10000 });
    await expect(networkStatus).toContainText('Cloud Connected');

    // Step D: Simulate Network Outage
    const toggleOfflineBtn = page.getByTestId('btn-toggle-offline-mode');
    await expect(toggleOfflineBtn).toBeVisible();
    await toggleOfflineBtn.click();

    // Verify Offline Mode Status Badge
    await expect(networkStatus).toContainText('Offline');

    // Verify Offline Active Banner with queued count
    const offlineBanner = page.getByTestId('banner-offline-active');
    await expect(offlineBanner).toBeVisible({ timeout: 10000 });
    await expect(offlineBanner).toContainText('Offline-First Local Storage Engine Active');

    const offlineCounter = page.getByTestId('counter-offline-pending-changes');
    await expect(offlineCounter).toBeVisible();
    await expect(offlineCounter).toContainText('1 Changes Queued');

    // Capture High-Resolution Screenshot of Offline Mode
    await page.screenshot({
      path: path.join(artifactDir, 'qa-83-doctor-offline-sync-engine.png'),
      fullPage: true,
    });

    // Step E: Trigger Cloud Sync upon Network Restoration
    const syncBtn = page.getByTestId('btn-trigger-manual-sync');
    await expect(syncBtn).toBeVisible();
    await syncBtn.click();

    // Verify Cloud Sync Completion Toast
    const syncToast = page.getByTestId('toast-sync-complete');
    await expect(syncToast).toBeVisible({ timeout: 10000 });
    await expect(syncToast).toContainText('Cloud Synchronized');

    // Verify Network Status returns to Connected
    await expect(networkStatus).toContainText('Cloud Connected');
  });

  // 2. PHASE 20 PART A: REAL-TIME DRUG-DRUG INTERACTION (DDI) & SAFE 1-CLICK SUBSTITUTION
  test('50.2 Doctor Chamber: Real-Time Drug-Drug Interaction (DDI) Detection & 1-Click Safe Substitution', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/doctor/, { timeout: 30000 });

    // Step B: Navigate to Doctor Chamber
    await page.goto('/doctor/chamber');
    await expect(page).toHaveURL('/doctor/chamber');

    const activeDossier = page.getByTestId('patient-dossier-card');
    await expect(activeDossier).toBeVisible({ timeout: 15000 });

    // Step C: Search and add interacting drug "Aldactone 25" (Spironolactone) to Telmisartan
    const drugSearchInput = page.getByTestId('input-drug-search');
    await expect(drugSearchInput).toBeVisible();
    await drugSearchInput.fill('Aldactone');

    const drugDropdown = page.getByTestId('drug-search-dropdown');
    await expect(drugDropdown).toBeVisible({ timeout: 10000 });

    const aldactoneOption = page.getByTestId('drug-option-drug-spiro-25');
    await expect(aldactoneOption).toBeVisible();
    await aldactoneOption.click();

    // Step D: Verify MAJOR CONTRAINDICATION (DDI) ALERT BANNER appears
    const ddiAlertBanner = page.getByTestId('banner-ddi-interaction-alert');
    await expect(ddiAlertBanner).toBeVisible({ timeout: 15000 });
    await expect(ddiAlertBanner).toContainText('MAJOR_CONTRAINDICATION');
    await expect(ddiAlertBanner).toContainText('Telmisartan');
    await expect(ddiAlertBanner).toContainText('Spironolactone');

    // Step E: Verify Safe Substitute Button
    const substituteBtn = page.getByTestId('btn-apply-safe-substitute');
    await expect(substituteBtn).toBeVisible();

    // Capture High-Resolution Screenshot of DDI Alert
    await page.screenshot({
      path: path.join(artifactDir, 'qa-84-doctor-ddi-safe-substitution.png'),
      fullPage: true,
    });

    // Step F: Execute 1-Click Safe Substitution
    await substituteBtn.click();

    // Verify DDI alert clears after safe substitution
    await expect(ddiAlertBanner).not.toBeVisible({ timeout: 10000 });
  });

  // 3. PHASE 20 PART B: PEDIATRIC WEIGHT-BASED DOSAGE SAFETY MATRIX
  test('50.3 Doctor Chamber: Pediatric Weight-Based Dosage Safety Window Verification', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/doctor/, { timeout: 30000 });

    // Step B: Navigate to Doctor Chamber
    await page.goto('/doctor/chamber');
    await expect(page).toHaveURL('/doctor/chamber');

    // Step C: Select Pediatric Token #15 (Aarav Meena, 6M, 18.5kg)
    const token15Chip = page.getByTestId('token-chip-15');
    await expect(token15Chip).toBeVisible({ timeout: 15000 });
    await token15Chip.click();

    // Step D: Verify Pediatric Weight-Based Dosage Calculator Card
    const pediatricCard = page.getByTestId('card-pediatric-weight-calculator');
    await expect(pediatricCard).toBeVisible({ timeout: 15000 });
    await expect(pediatricCard).toContainText('18.5 kg');
    await expect(pediatricCard).toContainText('15 mg/kg');
    await expect(pediatricCard).toContainText('278 mg');

    // Verify Verification Badge
    const verifiedBadge = page.getByTestId('badge-pediatric-dosing-verified');
    await expect(verifiedBadge).toBeVisible();
    await expect(verifiedBadge).toContainText('Therapeutic Window Verified');

    // Capture High-Resolution Screenshot of Pediatric Calculator
    await page.screenshot({
      path: path.join(artifactDir, 'qa-85-doctor-pediatric-weight-dosage.png'),
      fullPage: true,
    });
  });

  // 4. COMPREHENSIVE CLINICAL SAFETY SHIELD SIGNOFF
  test('50.4 Doctor Chamber: Complete & Sign Consultation with Full Clinical Safety Governance', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/doctor/, { timeout: 30000 });

    // Step B: Navigate to Doctor Chamber
    await page.goto('/doctor/chamber');
    await expect(page).toHaveURL('/doctor/chamber');

    // Step C: Complete & Preview Signed Prescription
    const signBtn = page.getByTestId('btn-sign-prescription');
    await expect(signBtn).toBeVisible({ timeout: 15000 });
    await signBtn.click();

    // Verify Letterhead Modal
    const previewModal = page.getByTestId('modal-prescription-preview');
    await expect(previewModal).toBeVisible({ timeout: 15000 });

    // Capture High-Resolution Screenshot of Final Clinical Governance Signoff
    await page.screenshot({
      path: path.join(artifactDir, 'qa-86-doctor-final-clinical-governance-signoff.png'),
      fullPage: true,
    });
  });

});
