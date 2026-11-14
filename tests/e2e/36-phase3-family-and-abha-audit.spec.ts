import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 3 Multi-Perspective Audit: Patient Family Profiles, Health Records & ABHA Integration (ABDM)', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test('36.1 Family Healthcare Dashboard & DPDP Caregiver Dependent Intake (/patient/family)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/patient/family');

    // 1. Verify Page Title & Compliance Badges
    await expect(page.locator('text=Family Healthcare Profiles')).toBeVisible();
    await expect(page.locator('text=DPDP Act 2023 Compliant').first()).toBeVisible();
    await expect(page.locator('text=ABDM Milestone 1')).toBeVisible();

    // 2. Verify Pre-Seeded Bhopal Caregiver Family
    const membersGrid = page.getByTestId('family-members-grid');
    await expect(membersGrid).toBeVisible();
    await expect(membersGrid.locator('text=Ramesh Kumar')).toBeVisible();
    await expect(membersGrid.locator('text=Kailash Prasad')).toBeVisible();
    await expect(membersGrid.locator('text=Savitri Devi')).toBeVisible();
    await expect(membersGrid.locator('text=Pooja Kumar')).toBeVisible();

    // Verify Chronic Condition Tags
    await expect(membersGrid.locator('text=Type 2 Diabetes')).toBeVisible();
    await expect(membersGrid.locator('text=Osteoarthritis')).toBeVisible();

    // 3. Add New Dependent Member (Arjun Kumar - Child)
    const btnAdd = page.getByTestId('btn-add-family-member');
    await expect(btnAdd).toBeVisible();
    await btnAdd.click();

    const addModal = page.getByTestId('modal-add-family');
    await expect(addModal).toBeVisible();

    await page.getByTestId('input-member-name').fill('Arjun Kumar');
    await page.getByTestId('select-member-relationship').selectOption('CHILD');
    await page.getByTestId('select-member-gender').selectOption('MALE');
    await page.getByTestId('input-member-age').fill('10');
    await page.getByTestId('select-member-blood').selectOption('B+');
    await page.getByTestId('input-member-conditions').fill('Childhood Asthma, Seasonal Dust Allergy');
    expect(await page.getByTestId('checkbox-dpdp-caregiver').isChecked()).toBe(true);

    // Save profile
    await page.getByTestId('btn-save-member').click();
    await expect(addModal).not.toBeVisible();

    // Verify Arjun Kumar is added to the grid
    await expect(membersGrid.locator('text=Arjun Kumar').first()).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-41-family-profiles-dashboard.png'),
      fullPage: true,
    });
  });

  test('36.2 ABDM Milestone 1 ABHA ID Verification & Ayushman Bharat Card Issuance', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/patient/family');

    // Click link ABHA on an unlinked member
    const linkBtn = page.locator('button[data-testid^="btn-link-abha-"]').first();
    await expect(linkBtn).toBeVisible();
    await linkBtn.click();

    // Verify ABDM Modal
    const abhaModal = page.getByTestId('modal-abha-link');
    await expect(abhaModal).toBeVisible();
    await expect(abhaModal.locator('text=Ayushman Bharat Digital Mission (ABDM)')).toBeVisible();

    // Step 1: Input 14-digit ABHA
    const abhaInput = page.getByTestId('input-abha-number');
    await expect(abhaInput).toBeVisible();
    await abhaInput.fill('91-2345-6789-0123');

    const btnRequestOtp = page.getByTestId('btn-request-abha-otp');
    await btnRequestOtp.click();

    // Step 2: Verify OTP
    const otpInput = page.getByTestId('input-abha-otp');
    await expect(otpInput).toBeVisible();
    await otpInput.fill('123456');

    const btnVerifyOtp = page.getByTestId('btn-verify-abha-otp');
    await btnVerifyOtp.click();

    // Step 3: Verify Official Ayushman Bharat Card Preview & Credits Award
    const cardPreview = page.getByTestId('abha-card-preview');
    await expect(cardPreview).toBeVisible();
    await expect(cardPreview.locator('text=National Health Authority • ABDM')).toBeVisible();
    await expect(cardPreview.locator('text=91-2345-6789-0123')).toBeVisible();
    await expect(cardPreview.locator('text=₹25 MediBooking Health Credits Awarded')).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-42-abdm-abha-linking-flow.png'),
    });

    // Close modal
    await page.getByTestId('btn-close-abha-success').click();
    await expect(abhaModal).not.toBeVisible();
  });

  test('36.3 Digital Health Vault Longitudinal Prescriptions, FHIR Standards & DPDP Export (/patient/health-vault)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/patient/health-vault');

    // 1. Verify Page & Records List
    await expect(page.locator('text=Family Digital Health Vault')).toBeVisible();
    await expect(page.locator('text=FHIR R4 Bundle Standard')).toBeVisible();

    const recordsList = page.getByTestId('health-records-list');
    await expect(recordsList).toBeVisible();

    // Verify Kailash Prasad's cardiovascular prescription
    await expect(recordsList.locator('text=Quarterly Cardiovascular & Diabetes Management')).toBeVisible();
    await expect(recordsList.locator('text=Kailash Prasad').first()).toBeVisible();
    await expect(recordsList.locator('text=Tab. Telmisartan 40mg')).toBeVisible();
    await expect(recordsList.locator('text=Tab. Metformin 500mg SR')).toBeVisible();

    // Verify Lab Report is listed
    await expect(recordsList.locator('text=Glycated Hemoglobin (HbA1c) & Lipid Profile Panel')).toBeVisible();

    // 2. Filter by Category: Prescriptions only
    await page.getByTestId('filter-type-prescription').click();
    await expect(recordsList.locator('text=Quarterly Cardiovascular & Diabetes Management')).toBeVisible();
    await expect(recordsList.locator('text=Glycated Hemoglobin (HbA1c) & Lipid Profile Panel')).not.toBeVisible();

    // Reset Category
    await page.getByTestId('filter-type-all').click();

    // 3. Test DPDP Section 12 Portability Export
    const btnExport = page.getByTestId('btn-export-records');
    await expect(btnExport).toBeVisible();
    await btnExport.click();

    const exportBanner = page.getByTestId('banner-export-success');
    await expect(exportBanner).toBeVisible();
    await expect(exportBanner).toContainText('Encrypted Health Records Archive (AES-256 ZIP) prepared under Section 12 DPDP Act 2023');

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-43-digital-health-vault.png'),
      fullPage: true,
    });
  });

  test('36.4 Caregiver 1-Click Family Dependent Booking in Doctor Profile (/dr/[slug])', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/dr/dr-rajesh-sharma-cardio');

    // Select Available Slot to Open Booking Modal
    const slotBtn = page.locator('[data-testid^="slot-btn-"]').first();
    await expect(slotBtn).toBeVisible();
    await slotBtn.click();

    // Verify Family Member Selector in Modal
    const famSelector = page.getByTestId('family-member-selector');
    await expect(famSelector).toBeVisible();
    await expect(famSelector.locator('text=Booking For / यह अपॉइंटमेंट किसके लिए है?')).toBeVisible();

    // Select Father (Kailash Prasad)
    const btnFather = page.getByTestId('btn-book-for-father');
    await expect(btnFather).toBeVisible();
    await btnFather.click();

    // Verify Auto-Populated Dependent Details
    const nameInput = page.getByTestId('input-patient-name');
    await expect(nameInput).toHaveValue('Kailash Prasad');

    const ageInput = page.getByTestId('input-patient-age');
    await expect(ageInput).toHaveValue('74');

    const genderSelect = page.getByTestId('select-patient-gender');
    await expect(genderSelect).toHaveValue('MALE');

    const symptomsInput = page.getByTestId('input-patient-symptoms');
    await expect(symptomsInput).toHaveValue('Type 2 Diabetes follow-up, BP review');

    // Fill contact & consent
    await page.getByTestId('input-patient-mobile').fill('9826011111');
    expect(await page.getByTestId('checkbox-dpdp-consent').isChecked()).toBe(true);

    // Pay and Confirm Booking
    const btnPay = page.getByTestId('btn-pay-booking-fee');
    await expect(btnPay).toBeVisible();
    await btnPay.click();

    // Verify Confirmation shows Kailash Prasad
    const confirmedPatient = page.getByTestId('confirmed-patient-family');
    await expect(confirmedPatient).toBeVisible();
    await expect(confirmedPatient).toContainText('Kailash Prasad (74 / M)');
    await expect(page.getByTestId('badge-booking-fee-paid')).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-44-family-dependent-booking.png'),
    });
  });
});
