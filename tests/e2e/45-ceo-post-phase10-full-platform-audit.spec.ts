import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('CEO Post-Phase 10 Comprehensive Platform Audit & Verification', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test.beforeEach(async ({ request }) => {
    // Deterministic queue reset to guarantee clean state across all browser engines
    try {
      await request.post('http://127.0.0.1:4000/api/v1/emr/reset-queue');
    } catch (e) {
      // In case server is cold
    }
  });

  // 1. PUBLIC PATIENT DISCOVERY & UNIFIED PATIENT HUB
  test('45.1 Patient Public Discovery, Streamlined Navbar, Symptom Triage & Unified Dashboard', async ({ page }) => {
    test.setTimeout(75000);

    // Step A: Home Page & Streamlined Navbar
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Instant Doctor Appointments');

    // Verify simplified public navbar: primary CTA, Patient Hub and Partner dropdown
    await expect(page.getByTestId('nav-btn-explore-doctors')).toBeVisible();
    await expect(page.getByTestId('nav-btn-patient-hub')).toBeVisible();
    await expect(page.getByTestId('nav-btn-partners-menu')).toBeVisible();

    // Verify Emergency Alert on cardiac symptom search
    const searchInput = page.locator('input[data-testid="home-search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.click();
    await searchInput.fill('chest heaviness');
    await expect(page.locator('text=Emergency Alert')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=108 Ambulance')).toBeVisible();

    // Step B: Unified Patient Dashboard
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard');
    await expect(page.locator('text=Family Healthcare Hub')).toBeVisible();

    // Tab 1: Family Profiles
    await page.getByTestId('tab-btn-family').click();
    await expect(page.locator('text=Family Healthcare Profiles')).toBeVisible();
    await expect(page.locator('text=Kailash Prasad').first()).toBeVisible();

    // Tab 2: Health Vault
    await page.getByTestId('tab-btn-vault').click();
    await expect(page.locator('text=Family Digital Health Vault')).toBeVisible();
    await expect(page.getByTestId('health-records-list')).toBeVisible();

    // Tab 3: Reviews
    await page.getByTestId('tab-btn-reviews').click();
    await expect(page.locator('text=Rate Your Consultation with Dr. Rajesh Sharma')).toBeVisible();

    // Tab 4: Live Queue Tracker
    await page.getByTestId('tab-btn-queue').click();
    await expect(page.getByTestId('section-live-queue')).toBeVisible();
    await expect(page.getByTestId('live-token-number')).toContainText('#14');

    // Capture Patient Unified Hub Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-07-post-p10-patient-unified-hub.png'),
      fullPage: true,
    });
  });

  // 2. RECEPTIONIST FRONT-DESK & TWO-WITNESS CASHIER HANDOVER
  test('45.2 Receptionist Live Queue, F2 Quick Intake & Two-Witness Cashier Handover', async ({ page }) => {
    test.setTimeout(75000);

    // Step A: Login as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Receptionist' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    // Step B: Verify Queue & F2 Walk-in Bar
    await expect(page.locator('text=Bhopal City Care Polyclinic • 4 Chambers Active')).toBeVisible();
    await expect(page.getByTestId('btn-walkin-intake')).toBeVisible();

    // Step C: Execute Two-Witness Shift Cashier Handover via Shift Drawer
    const shiftDrawerBtn = page.getByTestId('btn-open-shift-drawer');
    await expect(shiftDrawerBtn).toBeVisible();
    await shiftDrawerBtn.click();

    const handoverBtn = page.getByTestId('btn-open-cashier-handover');
    await expect(handoverBtn).toBeVisible();
    await handoverBtn.click();

    const handoverModal = page.getByTestId('modal-cashier-handover');
    await expect(handoverModal).toBeVisible();

    // Verify dual PIN inputs and zero variance
    await expect(handoverModal.locator('text=Morning Shift (08:30 - 14:30)').first()).toBeVisible();
    await expect(handoverModal.locator('text=₹12,400').first()).toBeVisible();
    await expect(handoverModal.locator('text=ZERO VARIANCE')).toBeVisible();

    // Fill 4-Digit Dual Sign-Off PINs
    const outgoingPin = page.getByTestId('input-outgoing-pin');
    await expect(outgoingPin).toBeVisible();
    await outgoingPin.fill('1234');

    const witnessPin = page.getByTestId('input-witness-pin');
    await expect(witnessPin).toBeVisible();
    await witnessPin.fill('5678');

    // Submit Dual Handover Sign-Off
    const confirmBtn = page.getByTestId('btn-confirm-handover');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify Handover Modal Closes & Verified Cryptographic Badge Appears
    await expect(handoverModal).not.toBeVisible();
    const verifiedBadge = page.getByTestId('badge-handover-verified');
    await expect(verifiedBadge).toBeVisible();
    await expect(verifiedBadge).toContainText('2-Witness Handover Verified');

    // Capture Receptionist Handover Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-08-post-p10-reception-cashier-handover.png'),
      fullPage: true,
    });
  });

  // 3. DOCTOR CLINICAL CHAMBER: DDI SHIELD, PEDIATRIC DOSER & 1-CLICK ADVANCE
  test('45.3 Doctor Chamber: Penicillin Shield, DDI Alert, Pediatric mg/kg & 1-Click Call Next', async ({ page }) => {
    test.setTimeout(90000);

    // Step A: Login as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/doctor/, { timeout: 30000 });

    // Step B: Enter Clinical Chamber
    await page.goto('/doctor/chamber');
    await expect(page).toHaveURL('/doctor/chamber');

    // Verify High-Velocity Chamber Queue Strip & Next Patient Preview
    await expect(page.getByTestId('chamber-queue-strip')).toBeVisible({ timeout: 15000 });
    const nextPeek = page.getByTestId('banner-next-patient-peek');
    await expect(nextPeek).toBeVisible({ timeout: 15000 });
    await expect(nextPeek).toContainText('#13');
    await expect(nextPeek).toContainText('Sunita Verma');

    // Verify Patient Dossier & Pre-Recorded Vitals
    const dossierCard = page.getByTestId('patient-dossier-card');
    await expect(dossierCard).toBeVisible();
    await expect(dossierCard.locator('text=Kailash Prasad')).toBeVisible();
    await expect(page.getByTestId('vital-bp')).toContainText('138/88');

    // Step C: Verify Penicillin Allergy Shield
    const drugSearchInput = page.getByTestId('input-drug-search');
    await drugSearchInput.fill('Augmentin');
    await page.getByTestId('drug-option-drug-amoxyclav-625').click();
    const allergyModal = page.getByTestId('modal-allergy-alert');
    await expect(allergyModal).toBeVisible();
    await page.getByTestId('btn-cancel-allergy-drug').click();
    await expect(allergyModal).not.toBeVisible();

    // Step D: Apply Routine HTN Bundle & Test Phase 10 Drug-Drug Interaction Shield
    await page.getByTestId('bundle-btn-proto-htn-routine').click();
    const medTable = page.getByTestId('medications-table');
    await expect(medTable.locator('text=Telma 40')).toBeVisible();

    // Add Spironolactone to trigger Telmisartan + Spironolactone Hyperkalemia DDI Alert
    await drugSearchInput.fill('Aldactone');
    const spiroOption = page.getByTestId('drug-option-drug-spiro-25');
    await expect(spiroOption).toBeVisible();
    await spiroOption.click();

    const ddiBanner = page.getByTestId('banner-ddi-alert');
    await expect(ddiBanner).toBeVisible();
    await expect(ddiBanner).toContainText('Severe Hyperkalemia Risk');
    await expect(ddiBanner).toContainText('Spironolactone');

    // Step E: Override DDI with Clinical Justification
    await page.getByTestId('btn-open-override').click();
    const overrideReason = page.getByTestId('input-override-reason');
    await expect(overrideReason).toBeVisible();
    await overrideReason.fill('Refractory essential hypertension; daily serum potassium monitoring ordered.');
    await page.getByTestId('btn-confirm-override').click();
    await expect(page.getByTestId('badge-ddi-overridden')).toBeVisible();

    // Step F: Test Phase 10 Pediatric Dosage Calculator
    await page.getByTestId('btn-toggle-pediatric-doser').click();
    const doserCard = page.getByTestId('card-pediatric-doser');
    await expect(doserCard).toBeVisible();

    // Select Pediatric Paracetamol Formula (15 mg/kg/dose)
    await page.getByTestId('btn-pediatric-pcm').click();
    await expect(page.getByTestId('text-pediatric-computed-dose')).toContainText('Calpol 250 Pead');

    // Capture CDS DDI & Pediatric Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-09-post-p10-doctor-cds-ddi-pediatric.png'),
      fullPage: true,
    });

    // Step G: 1-Click Sign & Advance Queue (Phase 8 High-Velocity Workflow)
    const signAndCallBtn = page.getByTestId('btn-sign-and-call-next');
    await expect(signAndCallBtn).toBeVisible();
    await expect(signAndCallBtn).toContainText('Token #13');

    await signAndCallBtn.click();

    // Verify instant zero-reload queue advancement to Token #13 (Sunita Verma)
    await expect(page.locator('text=Sunita Verma').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('banner-next-patient-peek')).toContainText('#14');

    // Capture High-Velocity Advanced Chamber Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-10-post-p10-doctor-high-velocity-advance.png'),
      fullPage: true,
    });
  });

  // 4. CLINIC ADMIN: SAAS PLAN STATUS, INSTANT RENEWAL & GST INVOICES
  test('45.4 Clinic Admin: SaaS Status Card, Instant Plan Renewal, Switcher & GST Invoices', async ({ page }) => {
    test.setTimeout(75000);

    // Step A: Login as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 15000 });

    // Step B: Verify SaaS Plan Status Card on Overview
    const planCard = page.getByTestId('card-saas-plan-status');
    await expect(planCard).toBeVisible();
    await expect(planCard.locator('text=Clinic Pro Plan')).toBeVisible();
    await expect(planCard.locator('text=B2B Polyclinic SaaS Subscription')).toBeVisible();

    const expiryText = page.getByTestId('text-saas-expiry');
    await expect(expiryText).toBeVisible();
    await expect(expiryText).toContainText('14 Days Remaining');

    const chambersText = page.getByTestId('text-saas-chambers');
    await expect(chambersText).toBeVisible();
    await expect(chambersText).toContainText('4 / 4 Chambers Active');

    // Instant Plan Renewal (+30 days)
    const renewBtn = page.getByTestId('btn-renew-saas-plan');
    await expect(renewBtn).toBeVisible();
    await renewBtn.click();

    const renewToast = page.getByTestId('toast-saas-renewed');
    await expect(renewToast).toBeVisible();
    await expect(renewToast).toContainText('+30 Days Extended');
    await expect(expiryText).toContainText('44 Days Remaining');

    // Step C: Verify BILLING Tab & Plan Switcher
    const billingTab = page.locator('button', { hasText: /SaaS Subscription Billing/i });
    await expect(billingTab).toBeVisible();
    await billingTab.click();

    await expect(page.locator('h3', { hasText: /B2B SaaS Subscription/i })).toBeVisible();

    // Test Billing Cycle Toggle (Monthly vs Annual with 20% off)
    const annualBtn = page.getByTestId('btn-cycle-annual');
    await expect(annualBtn).toBeVisible();
    await annualBtn.click();
    await expect(annualBtn).toContainText('Save 20%');

    // Test GST Invoice Download
    const invoiceBtn = page.getByTestId('btn-download-gst-invoice');
    await expect(invoiceBtn).toBeVisible();
    await invoiceBtn.scrollIntoViewIfNeeded();
    await invoiceBtn.click();

    const invoiceToast = page.getByTestId('toast-saas-notice');
    await expect(invoiceToast).toBeVisible({ timeout: 10000 });
    await expect(invoiceToast).toContainText('GST Tax Invoice');

    // Capture Clinic Admin SaaS Billing Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-11-post-p10-admin-saas-billing-suite.png'),
      fullPage: true,
    });
  });

  // 5. SUPER ADMIN: MULTI-CLINIC BI, 80/20 DOCTOR LEDGER & ENTERPRISE ENGINE
  test('45.5 Super Admin: Network OPD Command, 80/20 Ledger, Section 194J TDS & Idle Heatmap', async ({ page }) => {
    test.setTimeout(75000);

    // Step A: Login as Super Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 15000 });

    // Step B: Navigate to SAAS_BI Tab
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

    // Capture Super Admin Enterprise BI Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-ceo-12-post-p10-superadmin-bi-enterprise.png'),
      fullPage: true,
    });
  });
});
