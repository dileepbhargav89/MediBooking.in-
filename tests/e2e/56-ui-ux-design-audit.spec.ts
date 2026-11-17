import { test, expect } from '@playwright/test';

test.describe('E2E Suite 56: System Architect & UI/UX Design System Visual Audit', () => {
  const artifactDir =
    'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(60000);

  test('56.1 Visual Audit: Central Reception Desk Header, Metrics, Chambers & Queue', async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    await page.waitForTimeout(1000);

    // 1. Capture Full Page Screenshot of Decluttered Reception Desk
    await page.screenshot({
      path: `${artifactDir}/qa-118-reception-desk-ui-audit.png`,
      fullPage: true,
    });

    // 2. Open Walk-in Modal & Capture Comprehensive Demographic Form
    const intakeBtn = page.getByTestId('btn-walkin-intake');
    await expect(intakeBtn).toBeVisible();
    await intakeBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${artifactDir}/qa-119-reception-intake-modal-audit.png`,
    });
    await page.screenshot({
      path: `${artifactDir}/qa-124-comprehensive-patient-registration-modal.png`,
    });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 3. Switch to Patient Visit History Tab
    const historyTab = page.getByTestId('tab-patient-history');
    await expect(historyTab).toBeVisible();
    await historyTab.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: `${artifactDir}/qa-123-reception-decluttered-header-history.png`,
      fullPage: true,
    });

    // 4. Open Shift Operations & Cashier Drawer Modal
    const shiftDrawerBtn = page.getByTestId('btn-open-shift-drawer');
    await expect(shiftDrawerBtn).toBeVisible();
    await shiftDrawerBtn.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: `${artifactDir}/qa-126-shift-operations-cashier-drawer.png`,
    });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 5. Switch back to Live Queue & Test Edit Modal
    await page.getByTestId('tab-live-queue').click();
    await page.waitForTimeout(500);
    const editBtn = page.locator('button', { hasText: '✏️ Edit' }).first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${artifactDir}/qa-125-patient-edit-revert-actions.png`,
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
