import { test, expect } from '@playwright/test';
import path from 'path';

const artifactDir = 'C:\\Users\\DILEEP BHARGAV\\.gemini\\antigravity\\brain\\3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test.describe('Phase 13 & Phase 14: ABDM FHIR R4 Validation & Doctor Chamber Token Parking (Lab/STAT Hold)', () => {

  // 1. PHASE 14 PART A: DOCTOR CHAMBER TOKEN PARKING ON STAT LAB / ECG HOLD
  test('47.1 Doctor Chamber: Place Token on STAT Diagnostic Lab Hold & Advance Queue', async ({ page }) => {
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

    // Verify Active Patient Token #12 (Kailash Prasad)
    const activeDossier = page.getByTestId('patient-dossier-card');
    await expect(activeDossier).toBeVisible({ timeout: 15000 });
    await expect(activeDossier.locator('text=Kailash Prasad')).toBeVisible();
    await expect(activeDossier.locator('text=Token #12')).toBeVisible();

    // Verify Park Button
    const parkHoldBtn = page.getByTestId('btn-park-token-lab-hold');
    await expect(parkHoldBtn).toBeVisible();
    await parkHoldBtn.click();

    // Verify Park Hold Modal
    const parkModal = page.getByTestId('modal-park-token-hold');
    await expect(parkModal).toBeVisible();
    await expect(parkModal.locator('text=Select STAT Diagnostic Order')).toBeVisible();

    // Select reason & notes
    const reasonSelect = page.getByTestId('select-hold-reason');
    await expect(reasonSelect).toBeVisible();
    await reasonSelect.selectOption('STAT 12-Lead ECG (Chamber 4)');

    // Confirm Park & Call Next Patient
    const confirmParkBtn = page.getByTestId('btn-confirm-park-token');
    await expect(confirmParkBtn).toBeVisible();
    await confirmParkBtn.click();

    // Modal closes
    await expect(parkModal).toBeHidden();

    // Verify Park Toast Banner
    const parkToast = page.getByTestId('toast-token-parked');
    await expect(parkToast).toBeVisible();
    await expect(parkToast).toContainText('placed on STAT 12-Lead ECG');

    // Verify Parked Token Tray is now visible with Token #12
    const parkedTray = page.getByTestId('tray-parked-lab-hold');
    await expect(parkedTray).toBeVisible();
    await expect(parkedTray.locator('text=#12')).toBeVisible();
    await expect(parkedTray.locator('text=Kailash Prasad')).toBeVisible();
    await expect(parkedTray.locator('text=STAT 12-Lead ECG')).toBeVisible();

    // Verify Queue has advanced to next patient: Token #13
    await expect(activeDossier.locator('text=Token #13')).toBeVisible();

    // Take High-Resolution Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-73-doctor-token-parked-lab-hold.png'),
      fullPage: true,
    });
  });

  // 2. PHASE 14 PART B: RESUME CONSULTATION FROM DIAGNOSTIC LAB HOLD
  test('47.2 Doctor Chamber: Resume Consultation for Parked Token & Restore Clinical Draft', async ({ page }) => {
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

    // Park Token #12 first
    const parkHoldBtn = page.getByTestId('btn-park-token-lab-hold');
    await expect(parkHoldBtn).toBeVisible({ timeout: 15000 });
    await parkHoldBtn.click();

    const confirmParkBtn = page.getByTestId('btn-confirm-park-token');
    await expect(confirmParkBtn).toBeVisible();
    await confirmParkBtn.click();

    // Verify Parked Tray has Token #12
    const parkedTray = page.getByTestId('tray-parked-lab-hold');
    await expect(parkedTray).toBeVisible();

    // Click Resume Consultation button on the parked card
    const resumeBtn = page.getByTestId('btn-resume-parked-token-12');
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    // Verify Token #12 is restored as the active patient in chamber
    const activeDossier = page.getByTestId('patient-dossier-card');
    await expect(activeDossier.locator('text=Kailash Prasad')).toBeVisible();
    await expect(activeDossier.locator('text=Token #12')).toBeVisible();

    // Verify Parked Tray is now empty and hidden
    await expect(parkedTray).toBeHidden();

    // Verify Resumed Toast Banner
    const resumeToast = page.getByTestId('toast-token-parked');
    await expect(resumeToast).toBeVisible();
    await expect(resumeToast).toContainText('Resumed Consultation for Token #12');
  });

  // 3. PHASE 13 PART A: DOCTOR CHAMBER ABDM FHIR R4 BUNDLE VALIDATION & EXPORT
  test('47.3 Doctor Chamber: ABDM Milestone M2/M3 FHIR R4 Bundle Validation & Export', async ({ page }) => {
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
    await expect(page.getByTestId('patient-dossier-card')).toBeVisible({ timeout: 15000 });

    // Click ABDM FHIR R4 Validation button
    const fhirBtn = page.getByTestId('btn-validate-fhir-bundle');
    await expect(fhirBtn).toBeVisible();
    await fhirBtn.click();

    // Verify ABDM FHIR Validator Modal
    const fhirModal = page.getByTestId('modal-abdm-fhir-validator');
    await expect(fhirModal).toBeVisible();
    await expect(fhirModal.locator('text=NRCES Profile Validated')).toBeVisible();
    await expect(fhirModal.locator('text=100% ABDM M2/M3 Health Record Compliance')).toBeVisible();

    // Verify FHIR R4 JSON Document Preview
    const fhirPreview = page.getByTestId('pre-fhir-json-preview');
    await expect(fhirPreview).toBeVisible();
    await expect(fhirPreview).toContainText('Bundle');
    await expect(fhirPreview).toContainText('https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle');
    await expect(fhirPreview).toContainText('Composition');
    await expect(fhirPreview).toContainText('Patient');
    await expect(fhirPreview).toContainText('Practitioner');

    // Click Download FHIR R4 JSON
    const downloadFhirBtn = page.getByTestId('btn-download-fhir-json');
    await expect(downloadFhirBtn).toBeVisible();
    await downloadFhirBtn.click();

    // Take High-Resolution Screenshot of Doctor FHIR Validator Modal
    await page.screenshot({
      path: path.join(artifactDir, 'qa-74-doctor-abdm-fhir-r4-validator.png'),
      fullPage: true,
    });
  });

  // 4. PHASE 13 PART B: PATIENT DASHBOARD DIGITAL HEALTH VAULT FHIR R4 EXPORT
  test('47.4 Patient Dashboard: Digital Health Vault ABDM FHIR R4 Document Export', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Patient (Ramesh Patel / Family Caregiver)
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Patient Tracker' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/patient/, { timeout: 30000 });

    // Step B: Switch to Digital Health Vault Tab
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard');

    const vaultTab = page.getByTestId('tab-btn-vault');
    await expect(vaultTab).toBeVisible();
    await vaultTab.click();

    // Verify Health Vault Section
    const vaultSection = page.getByTestId('section-health-vault');
    await expect(vaultSection).toBeVisible();
    await expect(vaultSection.locator('text=Family Digital Health Vault')).toBeVisible();

    // Find first health record card and export FHIR JSON
    const recordCard = page.getByTestId('health-record-card-rec-rx-kailash-01');
    await expect(recordCard).toBeVisible();

    const exportFhirBtn = recordCard.getByTestId('btn-download-fhir-bundle');
    await expect(exportFhirBtn).toBeVisible();
    await exportFhirBtn.click();

    // Verify Patient FHIR Viewer Modal
    const patientFhirModal = page.getByTestId('modal-patient-fhir-view');
    await expect(patientFhirModal).toBeVisible();
    await expect(patientFhirModal.locator('text=ABDM Milestone M2/M3')).toBeVisible();
    await expect(patientFhirModal.locator('text=NRCES Compliant')).toBeVisible();

    // Verify standard JSON
    const preJson = page.getByTestId('pre-patient-fhir-json');
    await expect(preJson).toBeVisible();
    await expect(preJson).toContainText('Bundle');
    await expect(preJson).toContainText('https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle');

    // Trigger Download
    const downloadJsonBtn = page.getByTestId('btn-patient-export-fhir-json');
    await expect(downloadJsonBtn).toBeVisible();
    await downloadJsonBtn.click();

    // Modal closes
    await expect(patientFhirModal).toBeHidden();

    // Verify Confirmation Toast Banner
    const fhirToast = page.getByTestId('toast-patient-fhir-exported');
    await expect(fhirToast).toBeVisible();
    await expect(fhirToast).toContainText('Exported ABDM FHIR R4 Health Record Bundle (NRCES Compliant)');

    // Take High-Resolution Screenshot of Patient Health Vault with Toast
    await page.screenshot({
      path: path.join(artifactDir, 'qa-75-patient-vault-fhir-r4-export.png'),
      fullPage: true,
    });
  });

});
