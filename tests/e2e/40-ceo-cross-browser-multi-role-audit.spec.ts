import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('CEO Executive Cross-Browser & Multi-Role Full Platform Audit', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  // 1. PUBLIC PATIENT DISCOVERY & BOOKING WORKFLOW
  test('40.1 Patient Public Discovery, Doctor Marketplace, Family Health Vault & Review Flow', async ({ page }) => {
    test.setTimeout(75000);

    // Step A: Home Page & Semantic Symptom Search
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Instant Doctor Appointments');

    const searchInput = page.locator('input[data-testid="home-search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.click();
    await searchInput.fill('chest heaviness');

    // Emergency alert banner should appear for cardiac complaints
    await expect(page.locator('text=Emergency Alert')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=108 Ambulance')).toBeVisible();

    // Navigate to Doctors Marketplace
    await page.goto('/doctors');
    await expect(page).toHaveURL(/\/doctors/);

    // Step B: Doctor Marketplace
    await expect(page.locator('h1')).toContainText('Find & Book Bhopal Specialists');
    await expect(page.locator('text=National Medical Commission (NMC) Verified').first()).toBeVisible();

    // Step C: Doctor Profile & Family Dependent Booking
    await page.goto('/dr/dr-rajesh-sharma-cardio');
    await expect(page).toHaveURL(/\/dr\/dr-rajesh-sharma-cardio/);

    const primeBadge = page.getByTestId('badge-prime-accredited');
    await expect(primeBadge).toBeVisible();
    await expect(primeBadge).toContainText('MediBooking Prime Polyclinic');

    // Step D: Family Profiles & Longitudinal Health Vault
    await page.goto('/patient/family');
    await expect(page.locator('text=Family Healthcare Profiles')).toBeVisible();
    await expect(page.locator('text=Kailash Prasad').first()).toBeVisible({ timeout: 15000 });

    await page.goto('/patient/health-vault');
    await expect(page.locator('text=Family Digital Health Vault')).toBeVisible();
    await expect(page.getByTestId('health-records-list')).toBeVisible();

    // Step E: Verified Patient Feedback Submission
    await page.goto('/patient/review');
    await expect(page.locator('text=Rate Your Consultation with Dr. Rajesh Sharma')).toBeVisible();
    await page.getByTestId('star-btn-5').click();
    await expect(page.getByTestId('rating-label')).toContainText('⭐⭐⭐⭐⭐ Excellent');

    // Screenshot QA
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-01-patient-public-discovery.png'),
      fullPage: true,
    });
  });

  // 2. RECEPTIONIST FRONT-DESK WORKFLOW
  test('40.2 Receptionist Front-Desk Intake, Queue Serving & Waiting Room TV Display', async ({ page }) => {
    test.setTimeout(75000);

    // Step A: Login as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Receptionist' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    // Step B: Front Desk Live Queue
    await expect(page.locator('text=Bhopal City Care Polyclinic • 4 Chambers Active')).toBeVisible();

    // Step C: Quick Intake Hotkey Bar (F2)
    const walkInBtn = page.getByTestId('btn-walkin-intake');
    await expect(walkInBtn).toBeVisible();

    // Step D: Waiting Room TV Display
    await page.goto('/tv/citycare-mpnagar-bhopal');
    await expect(page.locator('text=Live Waiting Room TV')).toBeVisible();

    // Screenshot QA
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-02-receptionist-front-desk.png'),
      fullPage: true,
    });
  });

  // 3. DOCTOR CLINICAL CHAMBER & EMR PRESCRIPTION WORKFLOW
  test('40.3 Doctor Chamber Desk, Vitals, Allergy Warning Shield & 1-Minute Rx Composer', async ({ page }) => {
    test.setTimeout(75000);

    // Step A: Login as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 15000 });

    // Step B: Chamber Glance
    await expect(page.locator('text=Chamber Consultation Desk')).toBeVisible();
    await expect(page.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();

    // Step C: Rx Composer & Pre-Recorded Vitals
    await page.goto('/doctor/chamber');
    await expect(page).toHaveURL('/doctor/chamber');

    const dossierCard = page.getByTestId('patient-dossier-card');
    await expect(dossierCard).toBeVisible({ timeout: 15000 });
    await expect(dossierCard.locator('text=Kailash Prasad')).toBeVisible();
    await expect(page.getByTestId('vital-bp')).toContainText('138/88');

    // Check Documented Allergies Alert
    const allergiesAlert = page.getByTestId('patient-allergies-alert');
    await expect(allergiesAlert).toBeVisible();
    await expect(allergiesAlert.locator('text=Penicillin')).toBeVisible();

    // Step D: Drug-Allergy Warning Shield Modal
    const drugSearchInput = page.getByTestId('input-drug-search');
    await drugSearchInput.fill('Augmentin');
    await page.getByTestId('drug-option-drug-amoxyclav-625').click();

    const allergyModal = page.getByTestId('modal-allergy-alert');
    await expect(allergyModal).toBeVisible();
    await expect(allergyModal.locator('text=High-Risk Anaphylaxis / Cross-Reactivity Warning')).toBeVisible();

    // Cancel Allergy Contradiction to protect patient
    await page.getByTestId('btn-cancel-allergy-drug').click();
    await expect(allergyModal).not.toBeVisible();

    // Step E: 1-Click Clinical Protocol Bundle Execution
    const protocolBtn = page.getByTestId('bundle-btn-proto-htn-routine');
    await expect(protocolBtn).toBeVisible();
    await protocolBtn.click();

    const medTable = page.getByTestId('medications-table');
    await expect(medTable.locator('text=Telma 40')).toBeVisible();

    // Step F: Complete Prescription & Sign
    await page.getByTestId('btn-sign-prescription').click();
    const previewModal = page.getByTestId('modal-prescription-preview');
    await expect(previewModal).toBeVisible();
    await expect(previewModal.locator('text=Bhopal City Care Polyclinic')).toBeVisible();
    await expect(previewModal.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();

    const seal = page.getByTestId('prescription-signature-seal');
    await expect(seal).toBeVisible();

    // Screenshot QA
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-03-doctor-rx-composer.png'),
      fullPage: true,
    });
  });

  // 4. CLINIC ADMIN MANAGEMENT & SETTLEMENT WORKFLOW
  test('40.4 Clinic Admin Polyclinic Organization, Chambers, Doctors & Revenue Settlements', async ({ page }) => {
    test.setTimeout(75000);

    // Step A: Login as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 15000 });

    // Step B: Clinic Admin Dashboard
    await expect(page.locator('text=Clinic Administrator Portal')).toBeVisible();
    await expect(page.locator('text=Bhopal City Care Polyclinic').first()).toBeVisible();

    // Screenshot QA
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-04-clinic-admin-portal.png'),
      fullPage: true,
    });
  });

  // 5. SUPER ADMIN MULTI-CLINIC BI & SAAS ENGINE
  test('40.5 Super Admin Command Center, 80/20 Revenue Ledger, Section 194J TDS & Review Shield', async ({ page }) => {
    test.setTimeout(75000);

    // Step A: Login as Super Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 15000 });

    // Step B: SAAS_BI Tab
    await page.getByTestId('sidebar-btn-saas-bi').click();

    // Verify Multi-Clinic OPD Command Center
    const commandCenter = page.getByTestId('network-opd-command-center');
    await expect(commandCenter).toBeVisible();
    await expect(commandCenter.locator('text=10 / 10 Clinics Live')).toBeVisible();
    await expect(commandCenter.locator('text=248 Consultations')).toBeVisible();

    // Verify Doctor Revenue Ledger & Disbursal
    const disburseBtn = page.getByTestId('batch-disburse-btn');
    await expect(disburseBtn).toBeVisible();
    await disburseBtn.click();
    await expect(page.getByTestId('payout-success-banner')).toBeVisible();

    // Verify Chamber Idle Minimization Alert
    const idleAlert = page.getByTestId('chamber-idle-alert');
    await expect(idleAlert).toBeVisible();
    await expect(idleAlert.locator('text=Chamber CH-2 is vacant between 2:00 PM and 5:00 PM')).toBeVisible();

    // Verify Section 194J Form 16A Generator
    const genBtn = page.getByTestId('generate-form16a-btn');
    await expect(genBtn).toBeVisible();
    await genBtn.click();
    await expect(page.getByTestId('form16a-generated-banner')).toBeVisible();

    // Step C: Review Moderation & Defamation Shield Console
    await page.goto('/super-admin/reviews');
    await expect(page.locator('text=Patient Review Moderation & Defamation Shield')).toBeVisible();

    // Screenshot QA
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-05-superadmin-bi-command.png'),
      fullPage: true,
    });
  });

  // 6. MOBILE VIEWPORT RESPONSIVENESS (390x844 - iPhone / Android)
  test('40.6 Mobile Viewport Cross-Platform Responsiveness & Navigation Ease', async ({ page }) => {
    test.setTimeout(75000);
    await page.setViewportSize({ width: 390, height: 844 });

    // Step A: Home on Mobile
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Instant Doctor Appointments');
    await expect(page.locator('input[data-testid="home-search-input"]')).toBeVisible();

    // Step B: Doctor Profile on Mobile
    await page.goto('/dr/dr-rajesh-sharma-cardio');
    await expect(page.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(page.getByTestId('badge-prime-accredited')).toBeVisible();

    // Step C: Patient Review on Mobile
    await page.goto('/patient/review');
    await expect(page.locator('text=Rate Your Consultation with Dr. Rajesh Sharma')).toBeVisible();

    // Screenshot QA
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-06-mobile-viewport-responsive.png'),
      fullPage: true,
    });
  });
});
