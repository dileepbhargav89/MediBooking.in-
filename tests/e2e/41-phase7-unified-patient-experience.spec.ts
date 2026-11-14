import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 7: Unified Patient Experience, Navbar Simplification & Mobile First Hub', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  // 41.1 SIMPLIFIED PUBLIC NAVIGATION & PARTNER DROPDOWN
  test('41.1 Public Navbar Streamlining, Partner Dropdown & One-Click Navigation', async ({ page }) => {
    test.setTimeout(45000);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1. Brand Logo & Title
    await expect(page.locator('text=MediBooking.in').first()).toBeVisible();

    // 2. Direct Navigation Buttons
    const exploreDoctorsBtn = page.getByTestId('nav-btn-explore-doctors');
    await expect(exploreDoctorsBtn).toBeVisible();

    const patientHubBtn = page.getByTestId('nav-btn-patient-hub');
    await expect(patientHubBtn).toBeVisible();

    // 3. Partner Portals Dropdown
    const partnersMenuBtn = page.getByTestId('nav-btn-partners-menu');
    await expect(partnersMenuBtn).toBeVisible();

    // Hover to reveal dropdown
    await partnersMenuBtn.hover();
    await page.waitForTimeout(400);

    // Verify sublinks inside dropdown
    const onboardClinicLink = page.getByTestId('nav-btn-onboard-clinic');
    const onboardDoctorLink = page.getByTestId('nav-btn-onboard-doctor');
    const registerLink = page.getByTestId('nav-btn-patient-register');

    await expect(onboardClinicLink).toBeVisible();
    await expect(onboardDoctorLink).toBeVisible();
    await expect(registerLink).toBeVisible();

    // Capture Visual Artifact: Simplified Public Navbar
    await page.screenshot({
      path: path.join(artifactDir, 'qa-57-simplified-public-navbar.png'),
      fullPage: false,
    });
  });

  // 41.2 UNIFIED PATIENT DASHBOARD TAB NAVIGATION & VAULT
  test('41.2 Unified Patient Dashboard Tab Switching, Family Profiles & Health Vault', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/patient/dashboard');
    await page.waitForLoadState('networkidle');

    // Caregiver Account Card
    await expect(page.locator('h1')).toContainText('Ramesh Kumar Family Healthcare Hub');
    await expect(page.locator('text=DPDP ACT 2023 COMPLIANT')).toBeVisible();

    // Verify Default Tab is FAMILY
    await expect(page.getByTestId('section-family-profiles')).toBeVisible();
    await expect(page.locator('text=Kailash Prasad').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Savitri Devi').first()).toBeVisible();
    await expect(page.locator('text=Pooja Kumar').first()).toBeVisible();

    // Capture Visual Artifact: Family Profiles Tab
    await page.screenshot({
      path: path.join(artifactDir, 'qa-58-unified-patient-dashboard-family.png'),
      fullPage: false,
    });

    // Switch to Health Vault Tab
    const tabVault = page.getByTestId('tab-btn-vault');
    await expect(tabVault).toBeVisible();
    await tabVault.click();

    // Verify Vault Records
    await expect(page.getByTestId('section-health-vault')).toBeVisible();
    await expect(page.locator('text=FHIR R4 Bundle Standard')).toBeVisible();
    await expect(page.locator('text=Quarterly Cardiovascular & Diabetes Management')).toBeVisible();
    await expect(page.locator('text=Digitally Signed under IT Act 2000').first()).toBeVisible();

    // Capture Visual Artifact: Health Vault Tab
    await page.screenshot({
      path: path.join(artifactDir, 'qa-59-unified-patient-dashboard-vault.png'),
      fullPage: false,
    });

    // Switch to Reviews Tab
    const tabReviews = page.getByTestId('tab-btn-reviews');
    await expect(tabReviews).toBeVisible();
    await tabReviews.click();

    await expect(page.getByTestId('section-patient-reviews')).toBeVisible();
    await expect(page.locator('text=Rate Your Consultation with Dr. Rajesh Sharma')).toBeVisible();
    await expect(page.getByTestId('rating-label')).toContainText('Excellent');

    // Click 4-Star to test interactivity
    await page.getByTestId('star-btn-4').click();
    await expect(page.getByTestId('rating-label')).toContainText('4 Stars');

    // Click back to 5-Star and Submit
    await page.getByTestId('star-btn-5').click();
    await expect(page.getByTestId('rating-label')).toContainText('Excellent');
    await page.getByTestId('btn-submit-review').click();
    await expect(page.getByTestId('review-submitted-banner')).toBeVisible();

    // Switch to Live Queue Tab
    const tabQueue = page.getByTestId('tab-btn-queue');
    await expect(tabQueue).toBeVisible();
    await tabQueue.click();

    await expect(page.getByTestId('section-live-queue')).toBeVisible();
    await expect(page.getByTestId('live-token-number')).toContainText('#14');
    await expect(page.locator('text=Now In Chamber')).toBeVisible();
    await expect(page.locator('text=Token #11')).toBeVisible();
  });

  // 41.3 DEPENDENT FAMILY MEMBER ADDITION & ABHA M1 INTEGRATION
  test('41.3 Add Dependent Family Member & ABHA M1 Health ID Link Flow', async ({ page }) => {
    test.setTimeout(45000);

    await page.goto('/patient/dashboard');
    await page.waitForLoadState('networkidle');

    // Click Add Family Member
    const addBtn = page.getByTestId('btn-add-family-member');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Fill Modal Form
    const nameInput = page.getByTestId('input-new-member-name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Aarav Kumar');

    // Submit New Dependent
    const saveBtn = page.getByTestId('btn-save-family-member');
    await saveBtn.click();

    // Verify new member card in the grid
    await expect(page.locator('text=Aarav Kumar').first()).toBeVisible();

    // Test ABHA Link Flow on unlinked member (e.g. Savitri Devi)
    const linkAbhaBtn = page.locator('button:has-text("+ Link ABHA ID")').first();
    if (await linkAbhaBtn.isVisible()) {
      await linkAbhaBtn.click();
      await expect(page.locator('text=Ayushman Bharat Health Account (ABHA M1) Integration')).toBeVisible();

      // Click Generate & Link
      const confirmAbhaBtn = page.locator('button:has-text("Generate & Link ABHA ID")');
      await confirmAbhaBtn.click();

      // Notice should appear
      await expect(page.locator('text=Ayushman Bharat Digital Health Card Created & Linked')).toBeVisible();
    }
  });

  // 41.4 MOBILE VIEWPORT BOTTOM NAVIGATION
  test('41.4 Mobile Viewport Bottom Navigation (390x844 iPhone Viewport)', async ({ page }) => {
    test.setTimeout(45000);

    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/patient/dashboard');
    await page.waitForLoadState('networkidle');

    // Bottom Navigation Bar should be visible on mobile
    const bottomNav = page.getByTestId('mobile-patient-bottom-nav');
    await expect(bottomNav).toBeVisible();

    // Test Navigation from bottom bar to Health Vault
    const vaultBottomBtn = page.getByTestId('bottom-nav-vault');
    await expect(vaultBottomBtn).toBeVisible();
    await vaultBottomBtn.click();
    await expect(page.getByTestId('section-health-vault')).toBeVisible();

    // Test Navigation from bottom bar to Reviews
    const reviewBottomBtn = page.getByTestId('bottom-nav-reviews');
    await expect(reviewBottomBtn).toBeVisible();
    await reviewBottomBtn.click();
    await expect(page.getByTestId('section-patient-reviews')).toBeVisible();

    // Test Navigation from bottom bar to Token Queue
    const tokenBottomBtn = page.getByTestId('bottom-nav-token');
    await expect(tokenBottomBtn).toBeVisible();
    await tokenBottomBtn.click();
    await expect(page.getByTestId('section-live-queue')).toBeVisible();

    // Test Navigation from bottom bar back to Family
    const familyBottomBtn = page.getByTestId('bottom-nav-family');
    await expect(familyBottomBtn).toBeVisible();
    await familyBottomBtn.click();
    await expect(page.getByTestId('section-family-profiles')).toBeVisible();

    // Capture Visual Artifact: Mobile Bottom Navigation
    await page.screenshot({
      path: path.join(artifactDir, 'qa-60-mobile-patient-bottom-nav.png'),
      fullPage: false,
    });
  });
});
