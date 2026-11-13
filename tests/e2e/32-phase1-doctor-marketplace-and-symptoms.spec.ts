import { test, expect } from '@playwright/test';

test.describe('Phase 1 E2E: Consumer Discovery, Doctor Marketplace & Symptom Search', () => {
  test('1.1 Homepage semantic symptom search and emergency triage alert', async ({ page }) => {
    await page.goto('/');

    // 1. Verify Homepage hero and search bar
    const searchInput = page.locator('input[data-testid="home-search-input"]');
    await expect(searchInput).toBeVisible();

    // 2. Search for cardiac symptom "chest heaviness"
    await searchInput.fill('chest heaviness');

    // Emergency alert banner should appear for cardiac complaints
    await expect(page.locator('text=Emergency Alert')).toBeVisible();
    await expect(page.locator('text=108 Ambulance')).toBeVisible();

    // Cardiologist Dr. Rajesh Sharma should be displayed
    await expect(page.getByText('Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(page.getByText('Cardiology').first()).toBeVisible();

    // 3. Search for orthopedic symptom "knee pain"
    await searchInput.fill('knee pain');
    await expect(page.getByText('Dr. Sandeep Kothari').first()).toBeVisible();
    await expect(page.getByText('Orthopedics').first()).toBeVisible();

    // 4. Test Locality Filter: Clear search input and select "Kolar Road"
    await searchInput.fill('');
    await page.getByRole('button', { name: 'Kolar Road' }).click();
    await expect(page.getByText('Kolar Prime').first()).toBeVisible();
    await expect(page.getByText('Dr. Vivek Saxena').first()).toBeVisible();
  });

  test('1.2 Dedicated Doctors Marketplace (/doctors) with symptom auto-matching and filters', async ({ page }) => {
    await page.goto('/doctors');

    // Verify marketplace header & NMC badge
    await expect(page.locator('h1')).toContainText('Find & Book Bhopal Specialists');
    await expect(page.locator('text=National Medical Commission (NMC) Verified').first()).toBeVisible();

    // Search symptom "acne"
    const marketSearch = page.locator('input[data-testid="input-marketplace-search"]');
    await marketSearch.fill('acne');

    // Auto-matched badge for Dermatology
    await expect(page.locator('text=Auto-Matched: Dermatology')).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Dr. Priya Patel' })).toBeVisible();

    // Check conditions treated tags
    await expect(page.getByText('Acne & Pimples').first()).toBeVisible();

    // Reset filters
    const resetBtn = page.locator('button[data-testid="btn-reset-marketplace-filters"]');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Verify all doctors displayed again
    await expect(page.locator('text=Dr. Rajesh Sharma')).toBeVisible();
    await expect(page.locator('text=Dr. Sandeep Kothari')).toBeVisible();
  });

  test('1.3 Doctor profile (/dr/[slug]) displays NMC shield, treated symptoms, and DPDP consent booking', async ({ page }) => {
    await page.goto('/dr/dr-rajesh-sharma-cardio');

    // 1. Verify profile credentials & NMC registration
    await expect(page.locator('h1')).toContainText('Dr. Rajesh Sharma');
    await expect(page.locator('text=Verified Practitioner')).toBeVisible();
    await expect(page.getByText('🛡️ NMC: MP-38492')).toBeVisible();
    await expect(page.locator('text=Conditions & Symptoms Treated')).toBeVisible();
    await expect(page.locator('text=Emergency 108')).toBeVisible();

    // 2. Select an available slot
    const slotButton = page.locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM/i }).first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // 3. Verify slot lock banner
    await expect(page.locator('text=Slot held exclusively for you')).toBeVisible();

    // 4. Verify DPDP Act 2023 Consent Checkbox
    const dpdpCheckbox = page.locator('input[data-testid="checkbox-dpdp-consent"]');
    await expect(dpdpCheckbox).toBeVisible();
    await expect(dpdpCheckbox).toBeChecked();

    // 5. Fill patient details
    await page.fill('input[data-testid="input-patient-name"]', 'Ramesh Kumar');
    await page.fill('input[data-testid="input-patient-mobile"]', '9826012345');

    // 6. Confirm Booking & Pay ₹49 nominal token
    const confirmBtn = page.locator('button[data-testid="btn-pay-booking-fee"]');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // 7. Verify confirmation screen
    await expect(page.locator('text=Appointment Confirmed')).toBeVisible();
    await expect(page.locator('[data-testid="confirmed-token-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-booking-fee-paid"]')).toContainText('₹49 Booking Fee Paid Online');
    await expect(page.locator('text=Ramesh Kumar')).toBeVisible();
  });
});
