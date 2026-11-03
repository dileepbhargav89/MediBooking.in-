import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 1: Authentication & RBAC Dynamic Routing', () => {
  test('1.1 Unauthenticated access to protected portal redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/receptionist');
    await expect(page).toHaveURL(/\/login\?redirect=%2Freceptionist/);
    await expect(page.locator('h2')).toContainText('Single Sign-On Clinic Portal');
  });

  test('1.2 Indian Mobile Number Input enforces 10-digit format and enables OTP button', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    const phoneInput = page.locator('input[placeholder="98260 12345"]');
    const sendOtpButton = page.locator('button', { hasText: 'Send Verification OTP' });

    // Incomplete phone number -> button disabled
    await phoneInput.fill('98260');
    await expect(sendOtpButton).toBeDisabled();

    // Valid 10-digit Indian phone -> button enabled
    await phoneInput.fill('9826011111');
    await expect(sendOtpButton).toBeEnabled();

    // Send OTP
    await sendOtpButton.click();
    await expect(page.locator('text=6-Digit Verification OTP')).toBeVisible();
    await expect(page.locator('input[placeholder="• • • • • •"]')).toBeVisible();
  });

  test('1.3 Role Quick-Select buttons instantly authenticate and route to role portal', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Test Super Admin Demo Role
    await page.context().clearCookies();
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 10000 });
    await expect(page.locator('header')).toContainText('Super Admin Platform Console');

    // 2. Test Central Receptionist Demo Role
    await page.context().clearCookies();
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 10000 });
    await expect(page.locator('header')).toContainText('Central Reception Desk');

    // 3. Test Doctor Demo Role
    await page.context().clearCookies();
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 10000 });
    await expect(page.locator('header')).toContainText('Dr. Rajesh Sharma');

    // 4. Test Clinic Administrator Demo Role
    await page.context().clearCookies();
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 10000 });
    await expect(page.locator('header')).toContainText('Clinic Administrator Portal');

    // 5. Test Patient Demo Role
    await page.context().clearCookies();
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await page.locator('button', { hasText: 'Patient Tracker' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/patient', { timeout: 10000 });
    await expect(page.locator('header')).toContainText('Live Queue Tracker');
  });
});
