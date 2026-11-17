import { test, expect } from '@playwright/test';

test.describe('E2E Suite 56: System Architect & UI/UX Design System Visual Audit', () => {
  const artifactDir =
    'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test.use({ viewport: { width: 1440, height: 900 } });

  test('56.1 Visual Audit: Central Reception Desk Header, Metrics, Chambers & Queue', async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    await page.waitForTimeout(1000);

    // 1. Capture Full Page Screenshot of Reception Desk
    await page.screenshot({
      path: `${artifactDir}/qa-118-reception-desk-ui-audit.png`,
      fullPage: true,
    });

    // 2. Open Walk-in Modal & Capture Modal Alignment
    const intakeBtn = page.getByTestId('btn-walkin-intake');
    await expect(intakeBtn).toBeVisible();
    await intakeBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${artifactDir}/qa-119-reception-intake-modal-audit.png`,
    });

    await page.keyboard.press('Escape');
  });

  test('56.2 Visual Audit: Waiting Room TV Screen Header, Calling Display & Exit Navigation', async ({
    page,
  }) => {
    await page.goto('/tv/bhopal-city-care');
    await expect(page.locator('h1')).toContainText('Bhopal City Care Polyclinic');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${artifactDir}/qa-120-waiting-room-tv-ui-audit.png`,
      fullPage: true,
    });
  });

  test('56.3 Visual Audit: Doctor Chamber Desk Workspace & Action Grid', async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${artifactDir}/qa-121-doctor-chamber-ui-audit.png`,
      fullPage: true,
    });
  });

  test('56.4 Visual Audit: Patient Public Booking Flow & Commercial Fee Card', async ({
    page,
  }) => {
    await page.goto('/dr/dr-rajesh-sharma-cardio?city=bhopal');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Dr. Rajesh Sharma');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${artifactDir}/qa-122-patient-booking-profile-audit.png`,
      fullPage: true,
    });
  });
});
