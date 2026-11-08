import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 16 (Phase 57): Self-Serve Polyclinic Setup Wizard (/onboarding/clinic)', () => {
  const apiBase = 'http://127.0.0.1:4000';

  test('16.1 Home Page displays prominent CTA linking to Polyclinic Onboarding Wizard', async ({ page }) => {
    await page.goto('/');

    const heroCta = page.getByTestId('hero-btn-onboard-clinic');
    await expect(heroCta).toBeVisible();
    await heroCta.click();

    await page.waitForURL(/\/onboarding\/clinic/, { timeout: 10000 });
    await expect(page.locator('text=Launch Your Polyclinic in 3 Minutes')).toBeVisible();
    await expect(page.locator('text=Step 1 of 5')).toBeVisible();
  });

  test('16.2 Step 1 enforces Indian PIN code and 10-digit mobile number validation', async ({ page }) => {
    await page.goto('/onboarding/clinic');

    // Test invalid pincode (less than 6 digits)
    const pincodeInput = page.getByTestId('input-clinic-pincode');
    await pincodeInput.fill('4620');
    const nextBtn = page.getByTestId('btn-step1-next');
    await nextBtn.click();

    await expect(page.locator('text=Please enter a valid 6-digit Indian PIN code')).toBeVisible();

    // Fix pincode to valid 6 digits
    await pincodeInput.fill('462016');

    // Test invalid mobile (starts with 1)
    const mobileInput = page.getByTestId('input-admin-phone');
    await mobileInput.fill('1234567890');
    await nextBtn.click();
    await expect(page.locator('text=Admin mobile number must be a valid 10-digit Indian number')).toBeVisible();

    // Fix mobile to valid Indian number
    await mobileInput.fill('9826199999');
    await nextBtn.click();

    // Successfully transitioned to Step 2
    await expect(page.locator('text=Step 2: Physical Examination Chambers')).toBeVisible();
  });

  test('16.3 Step 2 Chamber Layout allows adding, customizing, and removing chambers', async ({ page }) => {
    await page.goto('/onboarding/clinic');

    // Step 1: Fill valid details and proceed
    await page.getByTestId('input-clinic-name').fill('Metro Polyclinic Bhopal');
    await page.getByTestId('input-clinic-address').fill('Sector B, Kasturba Nagar');
    await page.getByTestId('input-clinic-pincode').fill('462023');
    await page.getByTestId('input-admin-phone').fill('9893111222');
    await page.getByTestId('btn-step1-next').click();

    // Step 2: Verify default 4 chambers
    await expect(page.locator('text=Step 2: Physical Examination Chambers')).toBeVisible();
    const rows = page.locator('[data-testid^="chamber-row-"]');
    await expect(rows).toHaveCount(4);

    // Add a 5th chamber
    const addChamberBtn = page.getByTestId('btn-add-chamber');
    await addChamberBtn.click();
    await expect(rows).toHaveCount(5);

    // Customize the 5th chamber
    const ch5Number = page.getByTestId('input-chamber-number-4');
    await expect(ch5Number).toHaveValue('CH-5');
    const ch5Name = page.getByTestId('input-chamber-name-4');
    await ch5Name.fill('Dental & Maxillofacial Care');

    // Proceed to Step 3
    await page.getByTestId('btn-step2-next').click();
    await expect(page.locator('text=Step 3: Front Desk Receptionist Setup')).toBeVisible();
  });

  test('16.4 Complete 5-Step Polyclinic Setup Wizard creates tenant and launches live portals', async ({ page }) => {
    await page.goto('/onboarding/clinic');

    // --- STEP 1: Identity ---
    await page.getByTestId('input-clinic-name').fill('Aastha Multi-Speciality Polyclinic');
    await page.getByTestId('input-clinic-slug').fill('aastha-multispeciality');
    await page.getByTestId('input-clinic-tagline').fill('Comprehensive Family Healthcare & Diagnostics');
    await page.getByTestId('input-clinic-address').fill('Plot 18, Commercial Area, Arera Colony');
    await page.getByTestId('input-clinic-locality').fill('Arera Colony');
    await page.getByTestId('input-clinic-pincode').fill('462016');
    await page.getByTestId('input-admin-name').fill('Dr. Sunita Deshmukh');
    await page.getByTestId('input-admin-phone').fill('9826077777');
    await page.getByTestId('input-admin-email').fill('dr.sunita@aasthaclinic.com');
    await page.getByTestId('btn-step1-next').click();

    // --- STEP 2: Chambers ---
    await expect(page.locator('text=Step 2: Physical Examination Chambers')).toBeVisible();
    await page.getByTestId('btn-step2-next').click();

    // --- STEP 3: Staff Invitation ---
    await expect(page.locator('text=Step 3: Front Desk Receptionist Setup')).toBeVisible();
    await page.getByTestId('input-receptionist-name').fill('Kavita Sharma');
    await page.getByTestId('input-receptionist-phone').fill('9826088888');
    await page.getByTestId('btn-step3-next').click();

    // --- STEP 4: BharatQR & Cash Drawer ---
    await expect(page.locator('text=Step 4: BharatQR Cashless Counter & Billing')).toBeVisible();
    await page.getByTestId('input-upi-vpa').fill('aasthaclinic@icici');
    await page.getByTestId('input-merchant-name').fill('Aastha Healthcare Bhopal');
    await page.getByTestId('input-cash-float').fill('3000');
    expect(await page.getByTestId('checkbox-autoprint').isChecked()).toBe(true);

    // Submit wizard
    const submitBtn = page.getByTestId('btn-submit-onboarding');
    await submitBtn.click();

    // --- STEP 5: Success & Activation ---
    await expect(page.getByTestId('onboarding-success-screen')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=30-Day Pro Trial Active')).toBeVisible();
    await expect(page.locator('text=Aastha Multi-Speciality Polyclinic is Live!')).toBeVisible();
    const chambersBadge = page.getByTestId('chambers-ready-badge');
    await expect(chambersBadge).toBeVisible();
    await expect(chambersBadge).toContainText('4');
    await expect(chambersBadge).toContainText('Chambers Ready');

    // Verify Action Tiles
    const launchReception = page.getByTestId('btn-launch-reception');
    const launchTv = page.getByTestId('btn-launch-tv');
    const launchAdmin = page.getByTestId('btn-launch-admin');
    await expect(launchReception).toBeVisible();
    await expect(launchTv).toBeVisible();
    await expect(launchAdmin).toBeVisible();

    // Verify BharatQR Standee Mockup
    const standee = page.getByTestId('standee-mockup');
    await expect(standee).toBeVisible();
    await expect(standee.locator('text=aasthaclinic@icici')).toBeVisible();
    await expect(standee.locator('text=SCAN WITH ANY UPI APP')).toBeVisible();
    await expect(page.getByTestId('btn-print-standee')).toBeVisible();
  });

  test('16.5 REST API POST /api/v1/clinics/onboard-wizard validates payload and issues 30-day trial', async ({ request }) => {
    // 1. Missing required field validation
    const invalidRes = await request.post(`${apiBase}/api/v1/clinics/onboard-wizard`, {
      data: {
        name: 'Incomplete Clinic',
      },
    });
    expect(invalidRes.status()).toBe(400);
    const invalidJson = await invalidRes.json();
    expect(invalidJson.error).toBe('Validation Error');

    // 2. Successful provisioning
    const testSlug = `bhopal-city-ext-${Date.now()}`;
    const validRes = await request.post(`${apiBase}/api/v1/clinics/onboard-wizard`, {
      data: {
        name: 'Bhopal City Care Polyclinic Extension',
        slug: testSlug,
        addressLine: 'Block C, Kolar Road',
        locality: 'Kolar Road',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        pincode: '462042',
        adminName: 'Dr. Alok Nath',
        contactPhone: '9826055555',
        contactEmail: 'admin@bhopalcitycare.com',
        chambers: [
          { chamberNumber: 'CH-1', chamberName: 'General Consultation', floor: 'Ground Floor' },
          { chamberNumber: 'CH-2', chamberName: 'Dermatology & Cosmetology', floor: 'First Floor' },
        ],
        receptionistName: 'Rohan Mehra',
        receptionistMobile: '9826066666',
        upiVpa: 'bhopalcareext@icici',
        merchantName: 'Bhopal City Care Extension',
        openingCashFloat: 2500,
        autoPrintReceipt: true,
      },
    });

    expect(validRes.status()).toBe(201);
    const validJson = await validRes.json();
    expect(validJson.success).toBe(true);
    expect(validJson.clinic.slug).toBe(testSlug);
    expect(validJson.chambers).toHaveLength(2);
    expect(validJson.trial.plan).toBe('CLINIC_PRO');
    expect(validJson.trial.days).toBe(30);
    expect(validJson.adminUser.role).toBe('CLINIC_ADMIN');
    expect(validJson.adminUser.token).toBeDefined();
    expect(validJson.receptionistUser?.role).toBe('RECEPTIONIST');
    expect(validJson.receptionistUser?.token).toBeDefined();
    expect(validJson.urls.tvUrl).toBe(`/tv/${testSlug}`);
  });
});
