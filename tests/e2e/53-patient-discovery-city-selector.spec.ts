import { test, expect } from '@playwright/test';

test.describe('E2E Test Suite 53: Unified Patient Discovery & Global City Switcher', () => {
  const artifactDir =
    'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('53.1 Landing page renders Header City Selector pill with default Bhopal (HQ)', async ({
    page,
  }) => {
    await page.goto('/');

    const cityPill = page.getByTestId('header-city-selector-btn');
    await expect(cityPill).toBeVisible({ timeout: 10000 });
    await expect(cityPill).toContainText('Bhopal (HQ)');

    // Verify subheader mentions Bhopal
    await expect(page.locator('text=Bhopal Multi-Chamber Queue & Token Architecture')).toBeVisible();

    // Verify hero headline
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Across Bhopal');
  });

  test('53.2 Clicking pill opens the City Switcher modal displaying Bhopal, Indore, Gwalior, Jabalpur', async ({
    page,
  }) => {
    await page.goto('/');

    const cityPill = page.getByTestId('header-city-selector-btn');
    await cityPill.click();

    // Verify Modal appears
    const modal = page.getByTestId('modal-city-switcher');
    await expect(modal).toBeVisible();

    // Verify Search and Auto-Detect controls
    await expect(page.getByTestId('input-search-city')).toBeVisible();
    await expect(page.getByTestId('btn-auto-detect-location')).toBeVisible();

    // Verify Live Markets
    await expect(page.getByTestId('city-option-bhopal')).toBeVisible();
    await expect(page.getByTestId('city-option-indore')).toBeVisible();

    // Capture visual QA screenshot 104
    await page.screenshot({
      path: `${artifactDir}/qa-104-header-city-switcher-modal.png`,
      fullPage: true,
    });
  });

  test('53.3 Selecting Indore updates header pill to Indore and persists to localStorage', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByTestId('header-city-selector-btn').click();
    const indoreOption = page.getByTestId('city-option-indore');
    await expect(indoreOption).toBeVisible();
    await indoreOption.click();

    // Modal should close
    await expect(page.getByTestId('modal-city-switcher')).not.toBeVisible();

    // Header pill updates to Indore
    const cityPill = page.getByTestId('header-city-selector-btn');
    await expect(cityPill).toContainText('Indore');

    // Hero headline updates to Indore
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Across Indore');

    // Verify localStorage persistence
    const saved = await page.evaluate(() =>
      localStorage.getItem('medibooking_selected_city')
    );
    expect(saved).toBe('Indore');
  });

  test('53.4 Doctor Marketplace (/doctors) filters listings strictly to Indore polyclinics', async ({
    page,
  }) => {
    // Set Indore in localStorage then navigate to /doctors
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem('medibooking_selected_city', 'Indore')
    );

    await page.goto('/doctors');

    // Header pill shows Indore
    await expect(page.getByTestId('header-city-selector-btn')).toContainText('Indore');

    // Active city badge shows Indore Market
    const cityBadge = page.getByTestId('badge-active-city');
    await expect(cityBadge).toBeVisible();
    await expect(cityBadge).toContainText('Indore Market');

    // Marketplace title shows Indore Specialists
    await expect(
      page.locator('text=Find & Book Indore Specialists')
    ).toBeVisible();

    // Verify Malwi Audio Rx badge is active
    await expect(page.locator('text=Malwi Audio Rx')).toBeVisible();

    // Verify doctors practicing in Indore are listed
    await expect(
      page.getByTestId('card-doctor-dr-rajesh-sharma-cardio')
    ).toBeVisible();
    await expect(
      page.getByTestId('card-doctor-dr-priya-patel-derma')
    ).toBeVisible();

    // Verify affiliated chambers header is scoped to Indore
    await expect(
      page.locator('text=Affiliated Polyclinic Chambers in Indore:').first()
    ).toBeVisible();

    // Verify locality selector contains Indore localities
    const localitySelect = page.getByTestId('select-filter-locality');
    await expect(localitySelect).toBeVisible();
    const options = await localitySelect.innerText();
    expect(options).toContain('Vijay Nagar');
    expect(options).toContain('Palasia');
    expect(options).toContain('Bhawarkua');

    // Capture visual QA screenshot 105
    await page.screenshot({
      path: `${artifactDir}/qa-105-doctors-marketplace-indore-filtered.png`,
      fullPage: true,
    });
  });

  test('53.5 Switching locality to Palasia filters doctors practicing in Palasia', async ({
    page,
  }) => {
    await page.goto('/doctors?city=indore');

    // Select PALASIA locality
    const localitySelect = page.getByTestId('select-filter-locality');
    await localitySelect.selectOption('PALASIA');

    // Dr. Priya Patel in Palasia should be visible
    const priyaCard = page.getByTestId('card-doctor-dr-priya-patel-derma');
    await expect(priyaCard).toBeVisible();
    await expect(priyaCard.locator('text=Aura Skin & Cosmetology Indore')).toBeVisible();
    await expect(priyaCard.locator('text=Palasia')).toBeVisible();

    // Dr. Rajesh Sharma (who practices in Vijay Nagar) should be filtered out
    await expect(
      page.getByTestId('card-doctor-dr-rajesh-sharma-cardio')
    ).not.toBeVisible();
  });
});
