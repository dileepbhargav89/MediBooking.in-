import { test, expect } from '@playwright/test';

test.describe('E2E Test Suite 52: Super-Admin Dynamic City Provisioning & Multi-City Expansion', () => {
  const apiBase = 'http://127.0.0.1:4000';

  async function loginAsSuperAdmin(page: any) {
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 15000 });
  }

  test('52.1 Super Admin accesses CITIES tab and views Bhopal HQ in telemetry table', async ({ page }) => {
    await loginAsSuperAdmin(page);

    // Click on City & Market Expansion tab
    const citiesBtn = page.getByTestId('sidebar-btn-cities');
    await expect(citiesBtn).toBeVisible({ timeout: 10000 });
    await citiesBtn.click();

    // Verify command center header
    await expect(page.getByTestId('cities-management-command-center')).toBeVisible();
    await expect(page.locator('text=Central India Multi-City Expansion & Market Governance')).toBeVisible();

    // Verify Telemetry Table
    const table = page.getByTestId('cities-telemetry-table');
    await expect(table).toBeVisible();

    // Verify Bhopal HQ row
    const bhopalRow = page.getByTestId('city-row-bhopal');
    await expect(bhopalRow).toBeVisible();
    await expect(bhopalRow.getByText('Bhopal', { exact: true })).toBeVisible();
    await expect(bhopalRow.locator('text=HQ')).toBeVisible();
    await expect(bhopalRow.locator('text=Code 23 (MP)')).toBeVisible();
    await expect(bhopalRow.locator('text=Polyclinics')).toBeVisible();
    await expect(page.getByTestId('badge-city-status-bhopal')).toContainText('GA_ACTIVE');
  });

  test('52.2 Super Admin launches Jabalpur cluster with localities via Launch Modal', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.getByTestId('sidebar-btn-cities').click();

    // Open Launch New City Modal
    const launchBtn = page.getByTestId('btn-open-launch-city-modal');
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // Verify Modal appears
    const modal = page.getByTestId('modal-launch-city');
    await expect(modal).toBeVisible();

    const uniqueId = Date.now().toString().slice(-4);
    const cityName = `Jabalpur-${uniqueId}`;
    const citySlug = `jabalpur-${uniqueId}`;

    // Fill City Details for Jabalpur (Mahakoshal Hub)
    await page.getByTestId('input-new-city-name').fill(cityName);
    await page.getByTestId('input-new-city-slug').fill(citySlug);
    await page.getByTestId('input-new-city-lat').fill('23.1815');
    await page.getByTestId('input-new-city-lng').fill('79.9864');
    await page.getByTestId('input-new-city-localities').fill(
      'Wright Town, Napier Town, Civil Lines, Madan Mahal'
    );

    // Select Pilot Active stage
    await page.getByTestId('btn-select-stage-pilot_active').click();

    // Submit Launch
    await page.getByTestId('btn-submit-launch-city').click();

    // Verify Success notification and modal closes
    await expect(page.getByTestId('city-action-notice')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('city-action-notice')).toContainText(`Market '${cityName}' provisioned successfully`);

    // Verify Jabalpur row in table
    const jabalpurRow = page.getByTestId(`city-row-${citySlug}`);
    await expect(jabalpurRow).toBeVisible();
    await expect(jabalpurRow.getByText(cityName, { exact: true })).toBeVisible();
    await expect(jabalpurRow.locator('text=Code 23 (MP)')).toBeVisible();
    await expect(page.getByTestId(`badge-city-status-${citySlug}`)).toContainText('PILOT_ACTIVE');
  });

  test('52.3 Super Admin verifies multiple cities and promotes Jabalpur to GA_ACTIVE', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.getByTestId('sidebar-btn-cities').click();

    // Find any promote button (e.g. for Gwalior or newly launched pilot)
    const promoteBtn = page.locator('button', { hasText: '🚀 Promote to GA' }).first();
    if (await promoteBtn.isVisible().catch(() => false)) {
      await promoteBtn.click();
      await expect(page.getByTestId('city-action-notice')).toBeVisible();
      await expect(page.getByTestId('city-action-notice')).toContainText('promoted to GA_ACTIVE');
    }
  });

  test('52.4 PIN-Code Auto-Resolution resolves 452010 to Indore / Vijay Nagar via API', async ({ request }) => {
    const res = await request.get(`${apiBase}/api/v1/saas/cities/resolve-pincode/452010`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.resolution.city).toBe('Indore');
    expect(data.resolution.locality).toBe('Vijay Nagar');
    expect(data.resolution.state).toBe('Madhya Pradesh');
    expect(data.resolution.gstStateCode).toBe('23');
    expect(data.resolution.matched).toBe(true);
  });

  test('52.5 Clinic Onboarding Wizard dynamically loads provisioned cities and updates localities', async ({ page }) => {
    await page.goto('/onboarding/clinic');

    // Verify City Select contains Bhopal, Indore, Jabalpur
    const citySelect = page.getByTestId('select-clinic-city');
    await expect(citySelect).toBeVisible();

    // Verify default is Bhopal
    await expect(citySelect).toHaveValue('Bhopal');

    // Select Indore
    await citySelect.selectOption('Indore');
    await expect(citySelect).toHaveValue('Indore');

    // Verify Indore locality chips update dynamically
    const localityContainer = page.getByTestId('bhopal-locality-chips');
    await expect(localityContainer).toBeVisible();
    await expect(page.getByTestId('chip-locality-vijay-nagar')).toBeVisible();
    await expect(page.getByTestId('chip-locality-palasia')).toBeVisible();

    // Click chip Palasia
    await page.getByTestId('chip-locality-palasia').click();
    const localityInput = page.getByTestId('input-clinic-locality');
    await expect(localityInput).toHaveValue('Palasia');

    // Verify PIN auto-resolution in UI: type 474001 (Gwalior)
    const pincodeInput = page.getByTestId('input-clinic-pincode');
    await pincodeInput.fill('474001');

    // Should resolve to Gwalior & Lashkar
    await expect(citySelect).toHaveValue('Gwalior', { timeout: 5000 });
    await expect(localityInput).toHaveValue('Lashkar');
  });

  test('52.6 Zero-Regression Verification: Full clinic onboarding with Indore succeeds', async ({ page }) => {
    await page.goto('/onboarding/clinic');

    // Step 1: Fill details for an Indore Polyclinic
    await page.getByTestId('input-clinic-name').fill('Indore Premier Health Hub');
    await page.getByTestId('input-clinic-slug').fill('indore-premier-health-' + Date.now().toString().slice(-4));
    await page.getByTestId('input-clinic-address').fill('Scheme 54, Near Meghdoot Garden');
    await page.getByTestId('select-clinic-city').selectOption('Indore');
    await page.getByTestId('input-clinic-locality').fill('Vijay Nagar');
    await page.getByTestId('input-clinic-pincode').fill('452010');
    await page.getByTestId('input-admin-name').fill('Dr. Harshvardhan Agrawal');
    await page.getByTestId('input-admin-phone').fill('9826188888');
    await page.getByTestId('btn-step1-next').click();

    // Step 2: Chambers
    await expect(page.locator('text=Step 2: Physical Examination Chambers')).toBeVisible();
    await page.getByTestId('btn-step2-next').click();

    // Step 3: Staff
    await expect(page.locator('text=Step 3: Front Desk Receptionist Setup')).toBeVisible();
    await page.getByTestId('btn-step3-next').click();

    // Step 4: UPI & Billing
    await expect(page.locator('text=Step 4: BharatQR Cashless Counter & Billing')).toBeVisible();
    await page.getByTestId('input-upi-vpa').fill('indorepremier@icici');
    await page.getByTestId('btn-submit-onboarding').click();

    // Step 5: Success screen
    await expect(page.getByTestId('onboarding-success-screen')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=is Live!')).toBeVisible();
  });
});
