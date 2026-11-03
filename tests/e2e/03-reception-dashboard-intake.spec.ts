import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 3: Reception Dashboard & F2 Rapid Walk-In Intake', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist');
  });

  test('3.1 Reception dashboard renders 4-chamber queue tabs and cash drawer metrics', async ({ page }) => {
    await expect(page.locator('header')).toContainText('Central Reception Desk');
    await expect(page.locator('text=Cash In Drawer')).toBeVisible();
    await expect(page.locator('text=UPI Collections')).toBeVisible();

    // Verify chamber cards exist
    await expect(page.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(page.locator('text=Dr. Priya Patel').first()).toBeVisible();
  });

  test('3.2 Rapid Walk-in Intake modal opens on button click and submits new token', async ({ page }) => {
    // Click Walk-in Intake button
    const intakeBtn = page.locator('button', { hasText: '+ Walk-In Intake' });
    await intakeBtn.click();

    // Verify modal appears
    await expect(page.locator('text=Rapid Walk-In Patient Intake')).toBeVisible();

    // Fill intake form
    await page.fill('input[placeholder="98260 12345"]', '9826011111');
    await page.fill('input[placeholder="e.g. Ramesh Kumar"]', 'Ramesh Kumar');

    // Click Submit button
    const submitBtn = page.locator('button', { hasText: /Allocate Token & Generate Receipt/i });
    await submitBtn.click();

    // Verify ESC/POS 80mm Thermal Receipt Modal opens
    await expect(page.getByRole('dialog').getByText('BHOPAL CITY CARE POLYCLINIC')).toBeVisible();
    await expect(page.locator('text=TOKEN NUMBER')).toBeVisible();
    await expect(page.locator('text=Kumar').first()).toBeVisible();
  });
});
