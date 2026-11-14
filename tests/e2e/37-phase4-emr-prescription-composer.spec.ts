import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 4 Multi-Perspective Audit: Doctor Digital Prescription (Rx) Composer & Clinical EMR', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    // 1. Authenticate as Doctor via Single Sign-On Portal
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 15000 });

    // 2. Navigate to Chamber 1-Minute Rx Composer
    await page.goto('/doctor/chamber');
    await page.waitForLoadState('networkidle');
  });

  test('37.1 Doctor Chamber Glance & Consultation Queue with Pre-Recorded Vitals', async ({ page }) => {

    // 1. Verify Doctor & Clinic Credentials
    await expect(page.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(page.locator('text=NMC: MP-38492').first()).toBeVisible();
    await expect(page.locator('text=CH-3 • Bhopal City Care').first()).toBeVisible();

    // 2. Verify Today's Queue Bar & Tokens
    const queueBar = page.getByTestId('chamber-queue-bar');
    await expect(queueBar).toBeVisible();
    await expect(queueBar.locator('text=Kailash Prasad')).toBeVisible();
    await expect(queueBar.locator('text=Sunita Verma')).toBeVisible();
    await expect(queueBar.locator('text=Rajesh Dubey')).toBeVisible();

    // 3. Verify Active Token #12 Dossier & Pre-Recorded Vitals
    const dossierCard = page.getByTestId('patient-dossier-card');
    await expect(dossierCard).toBeVisible();
    await expect(dossierCard.locator('text=Token #12 • In Chamber')).toBeVisible();
    await expect(dossierCard.locator('text=Kailash Prasad')).toBeVisible();
    await expect(dossierCard.locator('text=74 Years / MALE')).toBeVisible();

    // Check Pre-Recorded Vitals
    await expect(page.getByTestId('vital-bp')).toContainText('138/88');
    await expect(page.getByTestId('vital-pulse')).toContainText('74');
    await expect(page.getByTestId('vital-spo2')).toContainText('98%');
    await expect(page.getByTestId('vital-sugar')).toContainText('142');
    await expect(dossierCard.locator('text=Recorded by Sunita (Front-Desk Staff)')).toBeVisible();

    // Check Documented Allergies Alert
    const allergiesAlert = page.getByTestId('patient-allergies-alert');
    await expect(allergiesAlert).toBeVisible();
    await expect(allergiesAlert.locator('text=Penicillin')).toBeVisible();
    await expect(allergiesAlert.locator('text=Sulfa drugs')).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-45-doctor-chamber-vitals.png'),
      fullPage: true,
    });
  });

  test('37.2 Real-Time Drug Autocomplete & Critical Drug-Allergy Warning Engine', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/doctor/chamber');

    // 1. Search for Augmentin (Amoxicillin)
    const searchInput = page.getByTestId('input-drug-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Augmentin');

    // 2. Verify Autocomplete Dropdown
    const dropdown = page.getByTestId('drug-search-dropdown');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('text=Augmentin 625 Duo')).toBeVisible();
    await expect(dropdown.locator('text=Amoxicillin & Potassium Clavulanate')).toBeVisible();

    // 3. Click to Add Augmentin (Should trigger Penicillin Allergy Contradiction)
    const augmentinOption = page.getByTestId('drug-option-drug-amoxyclav-625');
    await augmentinOption.click();

    // 4. Verify Critical Drug-Allergy Warning Modal
    const allergyModal = page.getByTestId('modal-allergy-alert');
    await expect(allergyModal).toBeVisible();
    await expect(allergyModal.locator('text=High-Risk Anaphylaxis / Cross-Reactivity Warning')).toBeVisible();
    await expect(allergyModal.locator('text=documented allergy to PENICILLIN')).toBeVisible();
    await expect(allergyModal.locator('text=Augmentin 625 Duo')).toBeVisible();

    // Capture visual screenshot of the Safety Warning
    await page.screenshot({
      path: path.join(artifactDir, 'qa-46-drug-allergy-safety-alert.png'),
    });

    // 5. Cancel selection to protect patient safety
    const btnCancel = page.getByTestId('btn-cancel-allergy-drug');
    await expect(btnCancel).toBeVisible();
    await btnCancel.click();
    await expect(allergyModal).not.toBeVisible();

    // Verify Augmentin was NOT added to the medications table
    const medTable = page.getByTestId('medications-table');
    await expect(medTable.locator('text=Augmentin 625 Duo')).not.toBeVisible();
  });

  test('37.3 1-Click Clinical Protocol Bundle Execution (3-Second Prescription)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/doctor/chamber');

    // 1. Click Hypertension Protocol Bundle
    const bundleBtn = page.getByTestId('bundle-btn-proto-htn-routine');
    await expect(bundleBtn).toBeVisible();
    await bundleBtn.click();

    // 2. Verify Diagnoses auto-populated
    const diagList = page.getByTestId('diagnoses-list');
    await expect(diagList.locator('text=Essential Hypertension (I10)')).toBeVisible();
    await expect(diagList.locator('text=Dyslipidemia')).toBeVisible();

    // 3. Verify Medications auto-populated in table
    const medTable = page.getByTestId('medications-table');
    await expect(medTable.locator('text=Telma 40')).toBeVisible();
    await expect(medTable.locator('text=Atorva 10')).toBeVisible();
    await expect(medTable.locator('select').first()).toHaveValue('1-0-0');
    await expect(medTable.locator('select').nth(1)).toHaveValue('0-0-1');

    // 4. Verify Investigations auto-populated
    const invList = page.getByTestId('investigations-list');
    await expect(invList.locator('text=Lipid Profile (Fasting)')).toBeVisible();
    await expect(invList.locator('text=Serum Creatinine & Electrolytes')).toBeVisible();
    await expect(invList.locator('text=12-Lead ECG')).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-47-one-click-protocol-composer.png'),
      fullPage: true,
    });
  });

  test('37.4 Digital Prescription Completion, NMC Digital Sign, WhatsApp Dispatch & Reception Print', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/doctor/chamber');

    // Apply Hypertension bundle first
    await page.getByTestId('bundle-btn-proto-htn-routine').click();

    // 1. Click Complete & Sign Rx Button
    const btnSign = page.getByTestId('btn-sign-prescription');
    await expect(btnSign).toBeVisible();
    await btnSign.click();

    // 2. Verify Official Letterhead Preview Modal
    const previewModal = page.getByTestId('modal-prescription-preview');
    await expect(previewModal).toBeVisible();
    await expect(previewModal.locator('text=Bhopal City Care Polyclinic')).toBeVisible();
    await expect(previewModal.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(previewModal.locator('text=NMC Reg No: MP-38492')).toBeVisible();
    await expect(previewModal.locator('text=Kailash Prasad')).toBeVisible();
    await expect(previewModal.locator('text=Token #12')).toBeVisible();

    // 3. Verify NMC Digital Signature Seal with SHA-256
    const seal = page.getByTestId('prescription-signature-seal');
    await expect(seal).toBeVisible();
    await expect(seal.locator('text=Digitally Signed under IT Act 2000 & NMC EMR Regulations 2023')).toBeVisible();
    await expect(seal.locator('text=SHA-256 Hash:')).toBeVisible();

    // 4. Test WhatsApp Dispatch
    const btnWhatsApp = page.getByTestId('btn-dispatch-whatsapp');
    await expect(btnWhatsApp).toBeVisible();
    await btnWhatsApp.click();

    const bannerWhatsApp = page.getByTestId('banner-dispatch-success');
    await expect(bannerWhatsApp).toBeVisible();
    await expect(bannerWhatsApp).toContainText('dispatched via WhatsApp Cloud API');

    // 5. Test Reception Silent Print
    const btnPrint = page.getByTestId('btn-print-reception');
    await expect(btnPrint).toBeVisible();
    await btnPrint.click();

    const bannerPrint = page.getByTestId('banner-print-success');
    await expect(bannerPrint).toBeVisible();
    await expect(bannerPrint).toContainText('Reception Thermal/A4 printer');

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-48-digital-signed-prescription-pdf.png'),
    });
  });
});
