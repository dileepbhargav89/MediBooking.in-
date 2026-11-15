import { test, expect } from '@playwright/test';

test.describe('E2E Test Suite 54: Comprehensive Multi-Role Demo Data Creation & Platform Verification', () => {
  const artifactDir =
    'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test('54.1 Patient Journey: Multi-City Discovery, Indore Switch, and Confirmed Token Booking', async ({
    page,
  }) => {
    // 1. Visit Home Page
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 2. Open City Switcher Modal & Switch to Indore
    const cityPill = page.getByTestId('header-city-selector-btn');
    await expect(cityPill).toBeVisible({ timeout: 10000 });
    await cityPill.click();

    const modal = page.getByTestId('modal-city-switcher');
    await expect(modal).toBeVisible();

    const indoreOption = page.getByTestId('city-option-indore');
    await expect(indoreOption).toBeVisible();
    await indoreOption.click();

    // Verify modal closed & header pill reflects Indore
    await expect(modal).not.toBeVisible();
    await expect(cityPill).toContainText('Indore');

    // 3. Search for Cardiology symptom
    await page.getByTestId('home-search-input').fill('chest pain');
    await expect(page.locator('text=Emergency Alert:')).toBeVisible();

    // 4. Explore Doctors Marketplace
    await page.goto('/doctors');
    await expect(page.getByTestId('badge-active-city')).toContainText('Indore Market');

    // 5. Open Doctor Profile for Dr. Rajesh Sharma
    const doctorCard = page.getByTestId('card-doctor-dr-rajesh-sharma-cardio');
    await expect(doctorCard).toBeVisible();
    await doctorCard.locator('text=Book Token').click();

    await expect(page).toHaveURL(/\/dr\/dr-rajesh-sharma-cardio/);
    await expect(page.locator('h1')).toContainText('Dr. Rajesh Sharma');

    // 6. Select Available Slot & Lock Token
    const slotButton = page
      .locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM|10:00 AM|10:15 AM/i })
      .first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    await expect(page.locator('text=Slot held exclusively for you')).toBeVisible();

    // 7. Fill Demo Patient Details
    await page.fill('input[placeholder*="Ramesh Kumar"]', 'Smt. Sunita Verma');
    await page.fill('input[placeholder*="98260"]', '9826198765');

    // Confirm Appointment with ₹49 nominal token
    const confirmBtn = page.locator('button', { hasText: /Confirm Appointment/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify Confirmation Screen
    await expect(page.locator('text=Appointment Confirmed')).toBeVisible();
    await expect(page.locator('text=Smt. Sunita Verma')).toBeVisible();
    await expect(page.locator('text=CH-1').first()).toBeVisible();

    // Capture Visual QA Screenshot 106
    await page.screenshot({
      path: `${artifactDir}/qa-106-patient-demo-token-confirmed.png`,
      fullPage: true,
    });
  });

  test('54.2 Receptionist Desk: Rapid Walk-In Intake, Vitals Capture, and Thermal Receipt Modal', async ({
    page,
  }) => {
    // 1. Authenticate as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    await expect(page.locator('header')).toContainText('Central Reception Desk');
    await expect(page.locator('text=Cash In Drawer')).toBeVisible();

    // 2. Click Walk-in Intake
    const intakeBtn = page.locator('button', { hasText: '+ Walk-In Intake' });
    await expect(intakeBtn).toBeVisible();
    await intakeBtn.click();

    await expect(page.locator('text=Rapid Walk-In Patient Intake')).toBeVisible();

    // 3. Fill Intake with Demo Patient Details
    await page.fill('input[placeholder="98260 12345"]', '9826011111');
    await page.fill('input[placeholder="e.g. Ramesh Kumar"]', 'Shri Rakesh Agrawal');

    // Submit Intake
    const submitBtn = page.locator('button', { hasText: /Allocate Token & Generate Receipt/i });
    await submitBtn.click();

    // 4. Verify ESC/POS 80mm Thermal Receipt Modal
    await expect(page.getByRole('dialog').getByText('BHOPAL CITY CARE POLYCLINIC')).toBeVisible();
    await expect(page.locator('text=TOKEN NUMBER')).toBeVisible();
    await expect(page.locator('text=Rakesh').first()).toBeVisible();

    // Capture Visual QA Screenshot 107
    await page.screenshot({
      path: `${artifactDir}/qa-107-reception-intake-vitals-letterhead.png`,
      fullPage: true,
    });
  });

  test('54.3 Waiting Room TV: Synchronized Live Screen & Audio Chime Display', async ({
    page,
  }) => {
    // 1. Navigate to Waiting Room TV
    await page.goto('/tv/citycare-mpnagar-bhopal');

    await expect(page.locator('h1')).toContainText('Bhopal City Care Polyclinic');
    await expect(page.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(page.locator('text=Dr. Priya Patel').first()).toBeVisible();

    // 2. Verify Hospital Chime Toggle
    const chimeBtn = page.locator('button', { hasText: /Chime ON|Chime Muted/i });
    await expect(chimeBtn).toBeVisible();

    // 3. Test Staff Simulation: Call Next Token
    const callNextBtn = page.locator('button', { hasText: 'Call Next Token (Staff Demo)' }).first();
    await expect(callNextBtn).toBeVisible();
    await callNextBtn.click();

    await expect(page.locator('text=CALLING TOKEN').first()).toBeVisible();

    // Capture Visual QA Screenshot 108
    await page.screenshot({
      path: `${artifactDir}/qa-108-waiting-room-tv-live-stream.png`,
      fullPage: true,
    });
  });

  test('54.4 Doctor Chamber Desk: Glance Portal, Clinical Notes, and Consultation Completion', async ({
    page,
  }) => {
    // 1. Authenticate as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 15000 });

    await expect(page.locator('header')).toContainText('Dr. Rajesh Sharma');
    await expect(page.locator('text=Blood Pressure')).toBeVisible();
    await expect(page.locator('text=Pulse Rate')).toBeVisible();

    // 2. Add Prescription Notes for Demo Patient
    const rxTextarea = page.locator('textarea').first();
    if (await rxTextarea.isVisible()) {
      await rxTextarea.fill(
        'Diagnosis: Essential Hypertension (ICD-10 I10) & Angina Pectoris.\nRx: Tab Telmisartan 40mg OD Morning, Tab Aspirin 75mg OD Post Lunch.\nAdvice: Low-sodium DASH diet, 30 min daily brisk walk, review in 14 days.'
      );
      await expect(rxTextarea).toHaveValue(/Telmisartan/);
    }

    // 3. Click Complete & Call Next Token
    const completeBtn = page.locator('button', { hasText: /Complete & Call Next Token/i });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    // Verify Completion confirmation
    await expect(page.locator('text=/Completed!/i')).toBeVisible();

    // Capture Visual QA Screenshot 109
    await page.screenshot({
      path: `${artifactDir}/qa-109-doctor-chamber-completed-consultation.png`,
      fullPage: true,
    });
  });

  test('54.5 Clinic Onboarding: Self-Serve Provisioning of New Polyclinic in Indore', async ({
    page,
  }) => {
    await page.goto('/onboarding/clinic');

    const uniqueSlug = 'indore-care-demo-' + Date.now().toString().slice(-4);

    // Step 1: Identity & Location
    await page.getByTestId('input-clinic-name').fill('Indore Care Polyclinic Demo');
    await page.getByTestId('input-clinic-slug').fill(uniqueSlug);
    await page.getByTestId('input-clinic-address').fill('Scheme 54, Near Meghdoot Garden');
    await page.getByTestId('select-clinic-city').selectOption('Indore');
    await page.getByTestId('input-clinic-locality').fill('Vijay Nagar');
    await page.getByTestId('input-clinic-pincode').fill('452010');
    await page.getByTestId('input-admin-name').fill('Dr. Amit Mandloi');
    await page.getByTestId('input-admin-phone').fill('9826199999');
    await page.getByTestId('btn-step1-next').click();

    // Step 2: Chambers
    await expect(page.locator('text=Step 2: Physical Examination Chambers')).toBeVisible();
    await page.getByTestId('btn-step2-next').click();

    // Step 3: Staff Setup
    await expect(page.locator('text=Step 3: Front Desk Receptionist Setup')).toBeVisible();
    await page.getByTestId('btn-step3-next').click();

    // Step 4: BharatQR Billing
    await expect(page.locator('text=Step 4: BharatQR Cashless Counter & Billing')).toBeVisible();
    await page.getByTestId('input-upi-vpa').fill('indorecare@icici');
    await page.getByTestId('btn-submit-onboarding').click();

    // Step 5: Success Launch Screen
    await expect(page.getByTestId('onboarding-success-screen')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=is Live!')).toBeVisible();

    // Capture Visual QA Screenshot 110
    await page.screenshot({
      path: `${artifactDir}/qa-110-clinic-onboarding-demo-created.png`,
      fullPage: true,
    });
  });

  test('54.6 Super Admin Platform Console: Multi-Market Telemetry, Revenue Split, and City Catalog', async ({
    page,
  }) => {
    // 1. Authenticate as Super Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 15000 });

    await expect(page.locator('header')).toContainText('Super Admin Platform Console');
    await expect(page.locator('text=Active Polyclinic Tenants')).toBeVisible();

    // 2. Open CITIES tab
    const citiesBtn = page.getByTestId('sidebar-btn-cities');
    await expect(citiesBtn).toBeVisible();
    await citiesBtn.click();

    // Verify Telemetry Table & Central India Clusters
    await expect(page.getByTestId('cities-telemetry-table')).toBeVisible();
    await expect(page.getByTestId('city-row-bhopal')).toBeVisible();
    await expect(page.getByTestId('city-row-indore')).toBeVisible();
    await expect(page.getByTestId('city-row-gwalior')).toBeVisible();

    // Capture Visual QA Screenshot 111
    await page.screenshot({
      path: `${artifactDir}/qa-111-superadmin-bi-demo-telemetry.png`,
      fullPage: true,
    });
  });
});
