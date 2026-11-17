import { test, expect } from '@playwright/test';

test.describe('E2E Test Suite 55: Executive Healthcare Platform Realistic Audit (CEO, User, QA, Developer)', () => {
  const artifactDir =
    'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test('55.1 Healthcare CEO Audit: Multi-City Commercial Model & Pricing Integrity Across Bhopal vs Indore', async ({
    page,
  }) => {
    // 1. Visit Dr. Rajesh Sharma's profile initialized with Bhopal context
    await page.goto('/dr/dr-rajesh-sharma-cardio?city=bhopal');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Dr. Rajesh Sharma');

    // 2. Validate Bhopal Practice Location & Fee (₹600)
    await expect(page.locator('text=Select Practice Location in Bhopal')).toBeVisible();
    await expect(page.getByTestId('doctor-fee-display')).toContainText('₹600');
    if (page.viewportSize() && page.viewportSize()!.width >= 640) {
      await expect(page.locator('text=/420\\+ Bhopal Reviews/')).toBeVisible();
    }

    // 3. Switch Venue to Indore (Indore Premier Health Hub in Vijay Nagar)
    const indoreVenueCard = page.locator('text=Indore Premier Health Hub').first();
    await expect(indoreVenueCard).toBeVisible();
    await indoreVenueCard.click();

    // 4. Validate Dynamic Pricing Update to Indore Commercial Benchmark (₹700)
    await expect(page.locator('text=Select Practice Location in Indore')).toBeVisible();
    await expect(page.getByTestId('doctor-fee-display')).toContainText('₹700');
    if (page.viewportSize() && page.viewportSize()!.width >= 640) {
      await expect(page.locator('text=/420\\+ Indore Reviews/')).toBeVisible();
    }

    // Validate Live Chamber Status Pill
    const chamberPill = page.getByTestId('chamber-live-status-pill');
    await expect(chamberPill).toBeVisible();
    await expect(chamberPill).toContainText('Chamber Active');
    await expect(chamberPill).toContainText('waiting');

    // 5. Select Available Slot and Verify Booking Modal Pricing Breakdown
    const slotButton = page
      .locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM|10:00 AM|10:15 AM/i })
      .first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // Verify Commercial Separation: Online ₹49 Token vs In-Clinic ₹700 Fee
    await expect(page.locator('text=₹49 (Payable Now)')).toBeVisible();
    await expect(page.locator('text=₹700 (Pay at Clinic Desk)')).toBeVisible();

    // Verify Localized BharatQR VPA for Indore Clinic
    await expect(page.locator('text=BHARAT UPI QR: indore-premier-health-hub@icici')).toBeVisible();

    // Capture Visual QA Screenshot 112: Indore Venue & Fee Integrity
    await page.screenshot({
      path: `${artifactDir}/qa-112-doctor-profile-indore-venue-fee.png`,
      fullPage: true,
    });
  });

  test('55.2 User Experience Audit: Multi-City Discovery Loop & Live Token Tracking for Gwalior Patient', async ({
    page,
  }) => {
    // 1. Patient lands on Home, opens City Switcher and chooses Gwalior
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const cityPill = page.getByTestId('header-city-selector-btn');
    await expect(cityPill).toBeVisible({ timeout: 10000 });
    await cityPill.click();

    const gwaliorOption = page.getByTestId('city-option-gwalior');
    await expect(gwaliorOption).toBeVisible();
    await gwaliorOption.click();

    await expect(cityPill).toContainText('Gwalior');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Across Gwalior');

    // 2. Click Find Doctors & Polyclinics to enter Gwalior Marketplace
    await page.goto('/doctors?city=gwalior');
    await expect(page.getByTestId('badge-active-city')).toContainText('Gwalior Market');
    await expect(page.locator('text=Bundeli Audio Rx')).toBeVisible();

    // 3. Find Dr. Alok Verma (Gwalior Neuro Care Center) & Book Token
    const gwaliorDocCard = page.getByTestId('card-doctor-dr-alok-verma-neuro');
    await expect(gwaliorDocCard).toBeVisible();
    await gwaliorDocCard.locator('text=Book Token').click();

    await expect(page).toHaveURL(/\/dr\/dr-alok-verma-neuro/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Dr. Alok Verma');

    // 4. Select Slot and Complete Booking
    const slotButton = page
      .locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM|10:00 AM|10:15 AM/i })
      .first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    await page.fill('input[placeholder*="Ramesh Kumar"]', 'Smt. Maya Yadav');
    await page.fill('input[placeholder*="98260"]', '9826312345');

    const confirmBtn = page.locator('button', { hasText: /Confirm Appointment/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // 5. Verify Confirmation Modal Details
    await expect(page.locator('text=Appointment Confirmed')).toBeVisible();
    await expect(page.locator('text=Smt. Maya Yadav')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Gwalior Neuro Care Center', { exact: true })).toBeVisible();

    // Verify WhatsApp share link contains Gwalior clinic details
    const waLink = page.locator('a', { hasText: /Share Token with Family on WhatsApp/i });
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toContain(encodeURIComponent('Gwalior Neuro Care Center'));

    // 6. Navigate to Live Tracker
    const trackQueueLink = page.locator('a', { hasText: /Track Live Queue Position/i });
    await expect(trackQueueLink).toBeVisible();
    await trackQueueLink.click();

    await expect(page).toHaveURL(/\/patient\?/);
    await expect(page.locator('body')).toContainText('Dr. Alok Verma');
    await expect(page.locator('body')).toContainText('Gwalior Neuro Care Center');
  });

  test('55.3 QA Testing Lead Audit: Resilience, Specialty Edge Cases & Empty-State Fallbacks in Emerging Hubs', async ({
    page,
  }) => {
    // 1. Navigate to Gwalior Marketplace
    await page.goto('/doctors?city=gwalior');
    const badge = page.getByTestId('badge-active-city');
    await expect(badge).toBeVisible({ timeout: 10000 });
    if (!(await badge.textContent())?.includes('Gwalior')) {
      const cityBtn = page.getByTestId('header-city-selector-btn');
      await cityBtn.click();
      await page.getByTestId('city-option-gwalior').click();
    }
    await expect(badge).toContainText('Gwalior Market', { timeout: 10000 });

    // 2. Search for a specialty not yet seeded in Gwalior (e.g. Dermatology / Acne)
    const searchInput = page.getByTestId('input-marketplace-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('dermatology acne');

    // 3. Verify Polished Zero-Result Empty State
    const emptyState = page.getByTestId('empty-doctors-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No doctors found in Gwalior matching your search criteria');
    await expect(emptyState).toContainText('MediBooking is actively onboarding verified polyclinics');

    // Capture Visual QA Screenshot 113: Gwalior Empty State Fallback
    await page.screenshot({
      path: `${artifactDir}/qa-113-gwalior-empty-state-fallback.png`,
      fullPage: true,
    });

    // 4. Click Switch to Bhopal HQ fallback CTA
    const switchBhopalBtn = page.getByTestId('btn-empty-switch-bhopal');
    await expect(switchBhopalBtn).toBeVisible();
    await switchBhopalBtn.click();

    // Verify Seamless Switch to Bhopal HQ and Doctor Discovery
    await expect(page.getByTestId('badge-active-city')).toContainText('Bhopal Market');

    // 5. Emergency Keyword Clinical Safety Triage Check
    await searchInput.fill('severe crushing chest pain radiating to left arm');
    const emergencyBanner = page.getByTestId('banner-emergency-triage');
    await expect(emergencyBanner).toBeVisible();
    await expect(emergencyBanner).toContainText('Emergency Medical Alert');
    await expect(emergencyBanner).toContainText('108 Ambulance');
  });

  test('55.4 Full-Stack Developer Audit: Real-Time Chamber Delay Broadcast Sync & Operational Integrity', async ({
    page,
  }) => {
    // 1. Authenticate as Doctor in Chamber
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 15000 });

    await expect(page.locator('header')).toContainText('Dr. Rajesh Sharma');

    // 2. Broadcast a +15 Mins Emergency Procedure Delay
    const delay15Btn = page.locator('button', { hasText: '+15 Mins' });
    await expect(delay15Btn).toBeVisible();
    await delay15Btn.click();

    // Verify Active Delay Badge on Doctor Workspace
    await expect(page.locator('text=+15m Active Delay')).toBeVisible();

    // 3. Check Waiting Room TV stream for synchronicity
    await page.goto('/tv/citycare-mpnagar-bhopal');
    await expect(page.locator('h1')).toContainText('Bhopal City Care Polyclinic');

    // Toggle Chime Audio
    const chimeBtn = page.locator('button', { hasText: /Chime ON|Chime Muted/i });
    await expect(chimeBtn).toBeVisible();
    await chimeBtn.click();

    // Staff Call Next Token Simulation
    const callNextBtn = page.locator('button', { hasText: 'Call Next Token (Staff Demo)' }).first();
    await expect(callNextBtn).toBeVisible();
    await callNextBtn.click();

    await expect(page.locator('text=CALLING TOKEN').first()).toBeVisible();
  });
});
