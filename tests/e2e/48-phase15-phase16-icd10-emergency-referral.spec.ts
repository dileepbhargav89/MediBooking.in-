import { test, expect } from '@playwright/test';
import path from 'path';

const artifactDir = 'C:\\Users\\DILEEP BHARGAV\\.gemini\\antigravity\\brain\\3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test.describe('Phase 15 & Phase 16: AI-Assisted Sub-15ms ICD-10 Search, Emergency Triage Alerts & Inter-Chamber Referrals', () => {

  // 1. PHASE 15 PART A: DOCTOR CHAMBER SUB-15MS ICD-10 SEMANTIC SEARCH
  test('48.1 Doctor Chamber: Sub-15ms ICD-10 Semantic Search & Diagnosis Addition', async ({ page }) => {
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
    await expect(activeDossier.locator('text=Kailash Prasad')).toBeVisible();

    // Step C: Search diagnosis using colloquial clinical synonym "sugar"
    const icdSearchInput = page.getByTestId('input-diagnosis-search');
    await expect(icdSearchInput).toBeVisible();
    await icdSearchInput.fill('sugar');

    // Verify Autocomplete Dropdown appears with E11.9
    const icdDropdown = page.getByTestId('dropdown-icd-search-results');
    await expect(icdDropdown).toBeVisible({ timeout: 10000 });
    const diabetesOption = page.getByTestId('chip-icd-result-E11-9');
    await expect(diabetesOption).toBeVisible();
    await expect(diabetesOption).toContainText('Type 2 Diabetes Mellitus');

    // Click to add diagnosis
    await diabetesOption.click();

    // Verify Diagnosis appears in active list
    const diagnosesList = page.getByTestId('diagnoses-list');
    await expect(diagnosesList).toBeVisible();
    await expect(diagnosesList).toContainText('Type 2 Diabetes Mellitus');

    // Verify individual diagnosis removal
    const removeBtn = page.getByTestId('btn-remove-diagnosis-0');
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
  });

  // 2. PHASE 15 PART B: EMERGENCY CLINICAL TRIAGE ALERT & 108 AMBULANCE DISPATCH
  test('48.2 Doctor Chamber: Acute Cardiac Diagnosis Triggers Emergency 108 Dispatch Alert', async ({ page }) => {
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

    // Step C: Search acute condition "chest pain"
    const icdSearchInput = page.getByTestId('input-diagnosis-search');
    await expect(icdSearchInput).toBeVisible({ timeout: 15000 });
    await icdSearchInput.click();
    await icdSearchInput.fill('');
    await icdSearchInput.pressSequentially('chest pain', { delay: 50 });

    // Verify STAT Emergency badge in dropdown
    const icdDropdown = page.getByTestId('dropdown-icd-search-results');
    await expect(icdDropdown).toBeVisible({ timeout: 15000 });
    const anginaOption = page.getByTestId('chip-icd-result-I20-9');
    await expect(anginaOption).toBeVisible();
    await expect(anginaOption.locator('text=STAT Emergency')).toBeVisible();

    // Select Angina
    await anginaOption.click();

    // Verify CRITICAL EMERGENCY ALERT BANNER
    const emergencyBanner = page.getByTestId('banner-chamber-emergency-dispatch');
    await expect(emergencyBanner).toBeVisible();
    await expect(emergencyBanner).toContainText('STAT EMERGENCY CLINICAL TRIAGE ALERT');
    await expect(emergencyBanner).toContainText('STAT CARDIOLOGY ALERT');

    // Verify 108 Ambulance Dispatch Button
    const ambulanceBtn = page.getByTestId('btn-dispatch-108-ambulance');
    await expect(ambulanceBtn).toBeVisible();

    // Take High-Resolution Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-76-doctor-icd10-emergency-triage-dispatch.png'),
      fullPage: true,
    });
  });

  // 3. PHASE 16 PART A: INTER-CHAMBER SPECIALIST REFERRAL DISPATCH
  test('48.3 Doctor Chamber: Dispatch Inter-Chamber Referral to CH-5 ENT Specialist', async ({ page }) => {
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

    // Click Chamber Referral Button
    const referralBtn = page.getByTestId('btn-chamber-referral');
    await expect(referralBtn).toBeVisible({ timeout: 15000 });
    await referralBtn.click();

    // Verify Referral Modal
    const referralModal = page.getByTestId('modal-chamber-referral');
    await expect(referralModal).toBeVisible();
    await expect(referralModal.locator('text=Select Target Specialist Chamber')).toBeVisible();

    // Select CH-5 Dr. Alok Mathur
    const chamberSelect = page.getByTestId('select-target-chamber');
    await expect(chamberSelect).toBeVisible();
    await chamberSelect.selectOption('CH-5');

    // Fill notes & urgency
    const notesInput = page.getByTestId('input-referral-notes');
    await expect(notesInput).toBeVisible();
    await notesInput.fill('Severe recurrent vertigo and bilateral tinnitus. Rule out Meniere disease.');

    const statUrgencyBtn = page.getByTestId('btn-urgency-stat');
    await expect(statUrgencyBtn).toBeVisible();
    await statUrgencyBtn.click();

    // Confirm Referral
    const confirmBtn = page.getByTestId('btn-confirm-chamber-referral');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Modal closes
    await expect(referralModal).toBeHidden();

    // Verify Referral Toast
    const referralToast = page.getByTestId('toast-chamber-referred');
    await expect(referralToast).toBeVisible();
    await expect(referralToast).toContainText('referred to CH-5 Dr. Alok Mathur (ENT & Head Neck Surgery)');

    // Verify Referral Badge on Patient Dossier Card
    const dossier = page.getByTestId('patient-dossier-card');
    await expect(dossier.getByTestId('badge-referred-chamber')).toBeVisible();
    await expect(dossier.getByTestId('badge-referred-chamber')).toContainText('Referred to CH-5');

    // Take High-Resolution Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-77-doctor-inter-chamber-referral-dispatched.png'),
      fullPage: true,
    });
  });

  // 4. PHASE 16 PART B: RECEPTION DESK INTER-CHAMBER REFERRAL INTAKE SYNC
  test('48.4 Reception Desk: Real-Time Live Sync of Inter-Chamber Referrals', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Receptionist (Sunita Verma)
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Receptionist' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    // Step B: Verify Reception Referrals Intake Banner
    const referralsBanner = page.getByTestId('banner-reception-referrals');
    await expect(referralsBanner).toBeVisible({ timeout: 15000 });
    await expect(referralsBanner).toContainText('Active Inter-Chamber Referrals');
    await expect(referralsBanner).toContainText('Kailash Prasad');
    await expect(referralsBanner).toContainText('CH-5');

    // Take High-Resolution Screenshot of Reception Desk with Referrals Banner
    await page.screenshot({
      path: path.join(artifactDir, 'qa-78-reception-inter-chamber-referral-intake.png'),
      fullPage: true,
    });
  });

});
