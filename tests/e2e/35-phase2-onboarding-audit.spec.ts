import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 2 Multi-Perspective Audit: Self-Service Polyclinic & Doctor Onboarding Wizards', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test('35.1 Polyclinic Onboarding Wizard with Locality Chips, Section 194J Compliance, and Test Token #01', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/onboarding/clinic');

    // Step 1: Verify Identity, Locality Quick Chips & Section 194J
    await expect(page.locator('text=Launch Your Polyclinic in 3 Minutes')).toBeVisible();
    await expect(page.getByTestId('bhopal-locality-chips')).toBeVisible();

    // Fill Clinic Name & select locality chip
    await page.getByTestId('input-clinic-name').fill('Shanti Multi-Speciality Care');
    await page.getByTestId('chip-locality-arera-colony').click();
    await expect(page.getByTestId('input-clinic-locality')).toHaveValue('Arera Colony');

    await page.getByTestId('input-clinic-address').fill('E-4 Commercial Arcade, Arera Colony');
    await page.getByTestId('input-clinic-pincode').fill('462016');
    await page.getByTestId('input-admin-name').fill('Dr. Ramesh Gupta');
    await page.getByTestId('input-admin-phone').fill('9826188899');

    // Verify Section 194J Financial Compliance
    const section194j = page.getByTestId('section-194j-card');
    await expect(section194j).toBeVisible();
    await expect(section194j.locator('text=Section 194J TDS & Tax Compliance')).toBeVisible();
    const panInput = page.getByTestId('input-clinic-pan');
    await panInput.fill('AAACG1234F');
    await page.getByTestId('input-clinic-gstin').fill('23AAACG1234F1Z9');

    // Proceed to Step 2
    await page.getByTestId('btn-step1-next').click();

    // Step 2: Chamber Layout with Automated Conflict Prevention
    await expect(page.locator('text=Step 2: Physical Examination Chambers')).toBeVisible();
    const conflictGuardBadge = page.getByTestId('chamber-conflict-guard-badge');
    await expect(conflictGuardBadge).toBeVisible();
    await expect(conflictGuardBadge.locator('text=Automated Chamber Conflict Prevention Active')).toBeVisible();
    await page.getByTestId('btn-step2-next').click();

    // Step 3: Receptionist Setup with 4-Digit Quick PIN
    await expect(page.locator('text=Step 3: Front Desk Receptionist Setup')).toBeVisible();
    await page.getByTestId('input-receptionist-name').fill('Sunita Verma');
    await page.getByTestId('input-receptionist-phone').fill('9826177788');
    const pinInput = page.getByTestId('input-receptionist-pin');
    await expect(pinInput).toBeVisible();
    await pinInput.fill('4321');
    await page.getByTestId('btn-step3-next').click();

    // Step 4: BharatQR Cashless & Auto-Print
    await expect(page.locator('text=Step 4: BharatQR Cashless Counter & Billing')).toBeVisible();
    await page.getByTestId('input-upi-vpa').fill('shanticare@icici');
    await page.getByTestId('input-merchant-name').fill('Shanti Healthcare Bhopal');
    await page.getByTestId('btn-submit-onboarding').click();

    // Step 5: Success Screen, Test Token #01, and Receptionist Tour CTA
    await expect(page.getByTestId('onboarding-success-screen')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=30-Day Pro Trial Active')).toBeVisible();
    await expect(page.locator('text=Shanti Multi-Speciality Care is Live!')).toBeVisible();

    // Test One-Click Sample Test Token #01 Generation
    const btnTestToken = page.getByTestId('btn-generate-test-token');
    await expect(btnTestToken).toBeVisible();
    await btnTestToken.click();

    // Verify Sample Token Preview appears
    const tokenPreview = page.getByTestId('test-token-preview');
    await expect(tokenPreview).toBeVisible();
    await expect(tokenPreview.locator('text=Sample Token #01 Successfully Dispatched!')).toBeVisible();
    await expect(tokenPreview.locator('text=WAITING (TV Alert Active)')).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-37-clinic-onboarding-success.png'),
      fullPage: true,
    });
  });

  test('35.2 Receptionist 90-Second Quick Start Mode (Sunita Walk-in Onboarding & Training in Hindi/English)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/onboarding/clinic');

    // Fill Step 1
    await page.getByTestId('input-clinic-name').fill('Care Center Polyclinic');
    await page.getByTestId('chip-locality-mp-nagar').click();
    await page.getByTestId('input-clinic-address').fill('Zone I, MP Nagar');
    await page.getByTestId('input-clinic-pincode').fill('462011');
    await page.getByTestId('input-admin-phone').fill('9826199911');
    await page.getByTestId('btn-step1-next').click();

    // Step 2 -> Step 3 -> Step 4 -> Submit
    await page.getByTestId('btn-step2-next').click();
    await page.getByTestId('btn-step3-next').click();
    await page.getByTestId('btn-submit-onboarding').click();

    await expect(page.getByTestId('onboarding-success-screen')).toBeVisible({ timeout: 15000 });

    // Launch Sunita's 90-Second Receptionist Tour
    const btnTour = page.getByTestId('btn-launch-receptionist-tour');
    await expect(btnTour).toBeVisible();
    await btnTour.click();

    // Verify Modal Header & Bilingual Content
    const tourModal = page.getByTestId('receptionist-quick-tour-modal');
    await expect(tourModal).toBeVisible();
    await expect(tourModal.locator('text=90-Second Rapid Onboarding')).toBeVisible();

    // Step 1: Walk-in Token
    await page.getByTestId('input-tour-patient-name').fill('Anand Verma');
    await page.getByTestId('btn-tour-step1-next').click();

    // Step 2: Quick Vitals
    await expect(tourModal.locator('text=Step 2: Quick Vitals Triage')).toBeVisible();
    await page.getByTestId('input-tour-bp').fill('130/85');
    await page.getByTestId('input-tour-sugar').fill('118');
    await page.getByTestId('btn-tour-step2-next').click();

    // Step 3: Print Receipt Preview & Completion Badge
    await expect(tourModal.locator('text=Step 3: Auto-Print Thermal Receipt')).toBeVisible();
    const sampleReceipt = page.getByTestId('tour-sample-receipt');
    await expect(sampleReceipt).toBeVisible();
    await expect(sampleReceipt.locator('text=Anand Verma')).toBeVisible();
    await expect(sampleReceipt.locator('text=BP: 130/85')).toBeVisible();

    const completionBadge = page.getByTestId('tour-completion-badge');
    await expect(completionBadge).toBeVisible();
    await expect(completionBadge).toContainText('Sunita is 100% Ready for Day-1 Receptionist Desk!');

    // Capture visual screenshot of the tour modal
    await page.screenshot({
      path: path.join(artifactDir, 'qa-38-receptionist-quick-tour.png'),
    });

    // Close tour
    await page.getByTestId('btn-tour-finish').click();
    await expect(tourModal).not.toBeVisible();
  });

  test('35.3 Doctor Self-Registration with Symptom Tags, NMC Status, and Automated Chamber Conflict Detection', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/onboarding/doctor');

    // Step 1: Credentials, Registration Year & Treated Symptoms
    await expect(page.locator('text=NMC Verified Doctor Onboarding')).toBeVisible();
    await page.getByTestId('input-doc-name').fill('Dr. Rajiv Mehra');
    await page.getByTestId('input-doc-phone').fill('9826133344');
    await page.getByTestId('input-doc-reg').fill('MP-77881');
    const regYearInput = page.getByTestId('input-doc-regyear');
    await expect(regYearInput).toBeVisible();
    await regYearInput.fill('2013');

    // Treated symptoms input
    const symptomsInput = page.getByTestId('input-doc-symptoms');
    await expect(symptomsInput).toBeVisible();
    await symptomsInput.fill('Chest Pain, High BP, Breathlessness, Palpitations');

    // Verify NMC Verification Status Badge & Statutory Declaration Checkbox
    const nmcBadge = page.getByTestId('badge-nmc-status');
    await expect(nmcBadge).toBeVisible();
    await expect(nmcBadge).toHaveText('NMC Verification Pending (MPMC)');
    expect(await page.getByTestId('checkbox-nmc-statutory').isChecked()).toBe(true);

    // Proceed to Step 2
    await page.getByTestId('btn-doc-step1-next').click();

    // Step 2: Chamber Practice & Chamber Conflict Detection
    await expect(page.locator('text=Step 2: Chamber Practice & Fee Structure')).toBeVisible();

    // Select CH-1 with Evening Timing: Conflict with Dr. Rajesh Sharma!
    await page.getByTestId('input-doc-chamber').fill('CH-1');
    await page.getByTestId('select-doc-timing').selectOption('Evening (05:30 PM – 08:30 PM)');

    // Verify Conflict Alert is triggered
    const conflictBanner = page.getByTestId('banner-chamber-conflict');
    await expect(conflictBanner).toBeVisible();
    await expect(conflictBanner).toContainText('Chamber Conflict Detected: CH-1 Already Occupied');

    // Click Resolve button to switch to CH-3
    const resolveBtn = page.getByTestId('btn-resolve-conflict-ch3');
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Verify Chamber is updated to CH-3 and conflict banner turns green
    await expect(page.getByTestId('input-doc-chamber')).toHaveValue('CH-3');
    await expect(conflictBanner).toContainText('Chamber CH-3 Available! Zero scheduling conflict.');

    // Verify 80/20 Revenue Split terms preview
    const revSplit = page.getByTestId('revenue-split-preview');
    await expect(revSplit).toBeVisible();
    await expect(revSplit.locator('text=80% / 20% Standard')).toBeVisible();

    // Verify Digital Prescription Signature Block
    const sigPreview = page.getByTestId('digital-signature-preview');
    await expect(sigPreview).toBeVisible();
    await expect(sigPreview.locator('text=Dr. Rajiv Mehra')).toBeVisible();

    // Submit doctor registration
    await page.getByTestId('btn-doc-submit').click();

    // Step 3: Success Screen with Chamber Poster
    await expect(page.getByTestId('doctor-onboarding-success')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Welcome, Dr. Rajiv Mehra!')).toBeVisible();
    await expect(page.locator('text=Chamber CH-3')).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-39-doctor-chamber-conflict-resolved.png'),
      fullPage: true,
    });
  });

  test('35.4 Mobile Viewport (390x844) Responsiveness for Onboarding Wizards', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Mobile Clinic Onboarding
    await page.goto('/onboarding/clinic');
    await expect(page.locator('text=Launch Your Polyclinic in 3 Minutes')).toBeVisible();
    await expect(page.getByTestId('chip-locality-mp-nagar')).toBeVisible();
    await expect(page.getByTestId('btn-step1-next')).toBeVisible();

    // 2. Mobile Doctor Onboarding
    await page.goto('/onboarding/doctor');
    await expect(page.locator('text=NMC Verified Doctor Onboarding')).toBeVisible();
    await expect(page.getByTestId('input-doc-name')).toBeVisible();
    await expect(page.getByTestId('badge-nmc-status')).toBeVisible();

    // Capture mobile responsive screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-40-mobile-onboarding-responsive.png'),
      fullPage: true,
    });
  });
});
