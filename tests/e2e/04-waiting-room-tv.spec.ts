import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 4: Waiting Room TV Screen', () => {
  test('4.1 TV Screen renders 4-chamber grid with live clock and audio chime toggle', async ({ page }) => {
    await page.goto('/tv/citycare-mpnagar-bhopal');

    await expect(page.locator('h1')).toContainText('Bhopal City Care Polyclinic');
    await expect(page.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(page.locator('text=Dr. Priya Patel').first()).toBeVisible();
    await expect(page.locator('text=Dr. Amit Verma').first()).toBeVisible();
    await expect(page.locator('text=Dr. Sunita Rao').first()).toBeVisible();

    // Verify Hospital Chime toggle
    const chimeBtn = page.locator('button', { hasText: /Chime ON|Chime Muted/i });
    await expect(chimeBtn).toBeVisible();
  });

  test('4.2 TV Screen handles simulated calling token updates without crashing', async ({ page }) => {
    await page.goto('/tv/citycare-mpnagar-bhopal');

    // Find and click the Call Next simulator button for Chamber 1
    const callNextBtn = page.locator('button', { hasText: 'Call Next Token (Staff Demo)' }).first();
    await expect(callNextBtn).toBeVisible();
    await callNextBtn.click();

    // Verify token number display exists
    await expect(page.locator('text=CALLING TOKEN').first()).toBeVisible();
  });
});
