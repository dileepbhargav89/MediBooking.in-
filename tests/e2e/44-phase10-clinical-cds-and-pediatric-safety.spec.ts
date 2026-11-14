import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 10: Clinical Decision Support 2.0 (DDI Shield & Pediatric Weight-Based Doser)', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    // 0. Reset Fastify EMR Consultation Queue to Initial Clean State
    try {
      await page.request.post('http://127.0.0.1:4000/api/v1/emr/reset-queue');
    } catch (e) {
      console.warn('Could not reset EMR queue:', e);
    }

    // 1. Authenticate as Doctor via Single Sign-On Portal
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 15000 });

    // 2. Navigate to Chamber Composer Desk
    await page.goto('/doctor/chamber');
    await page.waitForLoadState('networkidle');
  });

  // 44.1 REAL-TIME DRUG-DRUG INTERACTION (DDI) SHIELD & CLINICAL OVERRIDE
  test('44.1 Real-Time DDI Interaction Shield, Mechanism Warning & Audit Override Flow', async ({ page }) => {
    // 1. Verify Active Patient & Existing Prescription
    const dossier = page.getByTestId('patient-dossier-card');
    await expect(dossier).toBeVisible();
    await expect(dossier.locator('text=Kailash Prasad')).toBeVisible();

    const medTable = page.getByTestId('medications-table');
    await expect(medTable).toBeVisible();
    await expect(medTable.locator('text=Telma 40')).toBeVisible();

    // 2. Search & Prescribe Interacting Drug: Spironolactone (Aldactone 25)
    const searchInput = page.getByTestId('input-drug-search');
    await searchInput.fill('Aldactone');

    const dropdown = page.getByTestId('drug-search-dropdown');
    await expect(dropdown).toBeVisible();
    const spiroOption = page.getByTestId('drug-option-drug-spiro-25');
    await expect(spiroOption).toBeVisible();
    await spiroOption.click();

    // 3. Verify Real-Time Clinical CDS 2.0 DDI Alert Shield Appears
    const ddiBanner = page.getByTestId('banner-ddi-alert');
    await expect(ddiBanner).toBeVisible();
    await expect(ddiBanner.locator('text=HIGH CLINICAL RISK • CDS 2.0 SHIELD')).toBeVisible();

    const ddiTitle = page.getByTestId('text-ddi-title');
    await expect(ddiTitle).toContainText('Severe Hyperkalemia Risk: Telmisartan (ARB) + Spironolactone');
    await expect(ddiBanner.locator('text=Telma 40 ⚡ Aldactone 25')).toBeVisible();
    await expect(ddiBanner.locator('text=Mechanism:')).toBeVisible();
    await expect(ddiBanner.locator('text=Clinical Guidance:')).toBeVisible();

    // Capture Visual Artifact: DDI Interaction Shield
    await page.screenshot({
      path: path.join(artifactDir, 'qa-67-doctor-ddi-interaction-shield.png'),
      fullPage: true,
    });

    // 4. Test Clinical Override with Documented Justification
    const overrideBtn = page.getByTestId('btn-open-override');
    await expect(overrideBtn).toBeVisible();
    await overrideBtn.click();

    const reasonInput = page.getByTestId('input-override-reason');
    await expect(reasonInput).toBeVisible();
    await reasonInput.fill('Checked serum K+ 4.2; patient refractory to monotherapy; weekly K+ check planned');

    const confirmOverrideBtn = page.getByTestId('btn-confirm-override');
    await expect(confirmOverrideBtn).toBeVisible();
    await confirmOverrideBtn.click();

    // 5. Verify DDI Alert Dismissed & Overridden Audit Badge Displayed
    await expect(ddiBanner).not.toBeVisible();

    const overrideBadge = page.getByTestId('badge-ddi-overridden');
    await expect(overrideBadge).toBeVisible();
    await expect(overrideBadge).toContainText('Checked serum K+ 4.2');
    await expect(overrideBadge).toContainText('Audit Logged');
  });

  // 44.2 PEDIATRIC WEIGHT-BASED MG/KG DOSAGE CALCULATOR & 1-CLICK INSERTION
  test('44.2 Pediatric Weight-Based mg/kg Dosage Calculator & 1-Click Rx Insertion', async ({ page }) => {
    // 1. Toggle Pediatric Doser Widget
    const toggleBtn = page.getByTestId('btn-toggle-pediatric-doser');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    const doserCard = page.getByTestId('card-pediatric-doser');
    await expect(doserCard).toBeVisible();
    await expect(doserCard.locator('text=Pediatric Weight-Based mg/kg Dosage Calculator')).toBeVisible();

    // 2. Set Child Weight to 14 kg
    const weightInput = page.getByTestId('input-child-weight');
    await expect(weightInput).toBeVisible();
    await weightInput.fill('14');

    // 3. Test Amoxicillin Calculation (40 mg/kg/day TID)
    const amoxBtn = page.getByTestId('btn-pediatric-amox');
    await expect(amoxBtn).toBeVisible();
    await amoxBtn.click();

    const computedDose = page.getByTestId('text-pediatric-computed-dose');
    await expect(computedDose).toBeVisible();
    await expect(computedDose).toContainText('Novamox 250');
    await expect(computedDose).toContainText('3.7 ml TID');
    await expect(computedDose).toContainText('187 mg/dose');

    // 4. Test Paracetamol Calculation (15 mg/kg/dose SOS)
    const pcmBtn = page.getByTestId('btn-pediatric-pcm');
    await expect(pcmBtn).toBeVisible();
    await pcmBtn.click();

    await expect(computedDose).toContainText('Calpol 250 Pead');
    await expect(computedDose).toContainText('4.2 ml SOS');
    await expect(computedDose).toContainText('210 mg/dose');

    // Capture Visual Artifact: Pediatric Dosage Calculator
    await page.screenshot({
      path: path.join(artifactDir, 'qa-68-doctor-pediatric-dosage-calculator.png'),
      fullPage: true,
    });

    // 5. Click 1-Click Insert Dose to Rx
    const insertBtn = page.getByTestId('btn-insert-pediatric-dose');
    await expect(insertBtn).toBeVisible();
    await insertBtn.click();

    // 6. Verify Feedback Toast & Prescription Table Update
    const toast = page.getByTestId('toast-pediatric-dose-added');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Added Calpol 250 Pead');

    const medTable = page.getByTestId('medications-table');
    await expect(medTable).toContainText('Calpol 250 Pead');
    await expect(page.locator('input[value*="4.2 ml"]')).toBeVisible();
  });
});
