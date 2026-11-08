import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 17 (Phase 58): Doctor NMC Verification & Chamber Profile Claim (/onboarding/doctor)', () => {
  const apiBase = 'http://127.0.0.1:4000';

  test('17.1 Home page displays prominent CTA linking to Doctor Self-Registration Wizard', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const heroCta = page.getByTestId('hero-btn-onboard-doctor');
    await expect(heroCta).toBeVisible();
    await heroCta.click();

    await expect(page).toHaveURL(/\/onboarding\/doctor/, { timeout: 20000 });
    await expect(page.locator('text=NMC Verified Doctor Onboarding')).toBeVisible();
    await expect(page.locator('text=Step 1 of 3')).toBeVisible();
  });

  test('17.2 Step 1 enforces Indian mobile number and NMC registration validation', async ({ page }) => {
    await page.goto('/onboarding/doctor');

    // Test invalid phone number
    const phoneInput = page.getByTestId('input-doc-phone');
    await phoneInput.fill('12345');
    const nextBtn = page.getByTestId('btn-doc-step1-next');
    await nextBtn.click();

    await expect(page.locator('text=Please enter a valid 10-digit Indian mobile number')).toBeVisible();

    // Fix mobile number
    await phoneInput.fill('9826012345');

    // Test empty registration number
    const regInput = page.getByTestId('input-doc-reg');
    await regInput.fill('');
    await nextBtn.click();
    await expect(page.locator('text=NMC / State Medical Council Registration number is required')).toBeVisible();

    // Fix registration number
    await regInput.fill('MP-55443');
    await nextBtn.click();

    // Successfully transitioned to Step 2
    await expect(page.locator('text=Step 2: Chamber Practice & Fee Structure')).toBeVisible();
  });

  test('17.3 Complete Doctor Self-Onboarding provisions verified profile and generates Chamber QR Poster', async ({ page }) => {
    await page.goto('/onboarding/doctor');

    // --- STEP 1: Credentials ---
    await page.getByTestId('input-doc-name').fill('Dr. Siddharth Verma');
    await page.getByTestId('input-doc-phone').fill('9826098765');
    await page.getByTestId('input-doc-email').fill('dr.siddharth@gmail.com');
    await page.getByTestId('select-doc-council').selectOption('Madhya Pradesh Medical Council');
    await page.getByTestId('input-doc-reg').fill('MP-99887');
    await page.getByTestId('select-doc-specialty').selectOption('ORTHOPEDICS');
    await page.getByTestId('input-doc-qualifications').fill('MBBS, MS Orthopedics, MCh');
    await page.getByTestId('input-doc-experience').fill('15');
    await page.getByTestId('input-doc-bio').fill('Senior Joint Replacement & Arthroscopy Surgeon in Bhopal.');
    await page.getByTestId('btn-doc-step1-next').click();

    // --- STEP 2: Chamber & Fees ---
    await expect(page.locator('text=Step 2: Chamber Practice & Fee Structure')).toBeVisible();
    await page.getByTestId('input-doc-chamber').fill('CH-3');
    await page.getByTestId('input-doc-fee').fill('800');
    await page.getByTestId('input-doc-followup-fee').fill('400');
    await page.getByTestId('input-doc-followup-days').fill('14');

    // Submit wizard
    const submitBtn = page.getByTestId('btn-doc-submit');
    await submitBtn.click();

    // --- STEP 3: Activation & Poster Mockup ---
    await expect(page.getByTestId('doctor-onboarding-success')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=NMC Verified Practitioner')).toBeVisible();
    await expect(page.locator('text=Welcome, Dr. Siddharth Verma!')).toBeVisible();
    await expect(page.getByText('MP-99887', { exact: true })).toBeVisible();

    // Verify Action Tiles
    await expect(page.getByTestId('btn-launch-doctor-desk')).toBeVisible();
    await expect(page.getByTestId('btn-view-public-profile')).toBeVisible();

    // Verify Chamber Poster
    const poster = page.getByTestId('chamber-poster-mockup');
    await expect(poster).toBeVisible();
    await expect(poster.locator('text=Dr. Siddharth Verma')).toBeVisible();
    await expect(poster.locator('text=Chamber CH-3')).toBeVisible();
    await expect(poster.locator('text=SCAN TO BOOK OR TRACK TOKEN')).toBeVisible();
    await expect(page.getByTestId('btn-print-poster')).toBeVisible();
  });

  test('17.4 REST API POST /api/v1/doctors/onboard-doctor creates profile, claims chamber, and signs JWT', async ({ request }) => {
    // 1. Validation failure test
    const invalidRes = await request.post(`${apiBase}/api/v1/doctors/onboard-doctor`, {
      data: {
        fullName: 'Dr. Invalid Test',
        // missing mobile and registrationNumber
      },
    });
    expect(invalidRes.status()).toBe(400);

    // 2. Successful doctor onboarding
    const validRes = await request.post(`${apiBase}/api/v1/doctors/onboard-doctor`, {
      data: {
        fullName: 'Dr. Meenakshi Sundaram',
        mobile: '9826011223',
        email: 'dr.meenakshi@gmail.com',
        registrationNumber: 'MP-77889',
        stateMedicalCouncil: 'Madhya Pradesh Medical Council',
        specialties: ['PEDIATRICS'],
        qualifications: ['MBBS', 'MD Pediatrics'],
        experienceYears: 8,
        bio: 'Consultant Pediatrician specializing in neonatal intensive care and child nutrition.',
        chamberNumber: 'CH-2',
        consultationFeeRupees: 650,
        followUpValidityDays: 10,
      },
    });

    expect(validRes.status()).toBe(201);
    const validJson = await validRes.json();
    expect(validJson.success).toBe(true);
    expect(validJson.doctor.fullName).toBe('Dr. Meenakshi Sundaram');
    expect(validJson.doctor.isVerified).toBe(true);
    expect(validJson.doctor.slug).toContain('dr-meenakshi-sundaram');
    expect(validJson.affiliation.chamberNumber).toBe('CH-2');
    expect(validJson.affiliation.consultationFeeRupees).toBe(650);
    expect(validJson.token).toBeDefined();
    expect(validJson.urls.publicProfileUrl).toContain('/dr/');
    expect(validJson.urls.doctorPortalUrl).toBe('/doctor');
  });
});
