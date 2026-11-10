import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\DILEEP BHARGAV\\.gemini\\antigravity\\brain\\3156ef61-eedf-40f0-bde3-ad9cf6b39876';

function copyToArtifact(localRelPath: string, filename: string) {
  try {
    const src = path.resolve(localRelPath);
    const dest = path.join(ARTIFACT_DIR, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  } catch (err) {
    console.error('Failed to copy screenshot to artifact dir:', err);
  }
}

test.describe('E2E Workflow 27: User Registration, Profile Intake & Full Logout Flow Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('27.1 Home page and Login page link seamlessly to User Registration (/register)', async ({ page }) => {
    // 1. Visit Home Page
    await page.goto('/');
    await expect(page.locator('text=Instant Doctor Appointments')).toBeVisible();

    // Verify Nav Register button
    const navRegisterBtn = page.getByTestId('nav-btn-patient-register');
    await expect(navRegisterBtn).toBeVisible();

    // Verify Hero Patient Register button
    const heroRegisterBtn = page.getByTestId('hero-btn-patient-register');
    await expect(heroRegisterBtn).toBeVisible();

    // Click Hero Register button
    await heroRegisterBtn.click();
    await expect(page).toHaveURL(/\/register/);

    // Verify Register Page Brand & Title
    await expect(page.locator('h2')).toContainText('Patient & Family Registration');
    await expect(page.locator('text=Step 1 of 3: Mobile Verification')).toBeVisible();

    // 2. Also test link from /login to /register
    await page.goto('/login');
    const gotoRegisterLink = page.getByTestId('btn-goto-register');
    await expect(gotoRegisterLink).toBeVisible();
    await gotoRegisterLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('27.2 Complete 3-Step Patient Registration creates profile, stores DPDP consent, and auto-logs into /patient', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/register');

    // Step 1: Phone & OTP
    const phoneInput = page.locator('input[placeholder="98260 12345"]');
    await phoneInput.fill('9826188888');

    const sendOtpBtn = page.locator('button', { hasText: 'Send Verification OTP' });
    await expect(sendOtpBtn).toBeEnabled();
    await sendOtpBtn.click();

    await expect(page.locator('text=Enter 6-Digit OTP')).toBeVisible({ timeout: 10000 });

    // Use fast fill test OTP button
    await page.click('button:has-text("Fast Fill Test OTP")');

    // Verify & Continue
    await page.click('button:has-text("Verify & Continue to Profile")');

    // Step 2: Personal Demographics
    await expect(page.locator('text=Step 2 of 3: Personal Details')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="e.g. Ramesh Kumar Sharma"]', 'Praveen Tiwari');
    await page.fill('input[placeholder="35"]', '38');
    await page.selectOption('select >> nth=0', 'MALE');
    await page.selectOption('select >> nth=1', 'Arera Colony (E-1 to E-5)');
    await page.fill('input[placeholder="ramesh.sharma@example.com"]', 'praveen.tiwari@example.com');

    await page.click('button:has-text("Next: Medical Baseline →")');

    // Step 3: Medical Baseline & DPDP Consent
    await expect(page.locator('text=Step 3 of 3: Medical Baseline')).toBeVisible({ timeout: 10000 });
    await page.selectOption('select >> nth=0', 'B+');
    await page.fill('input[placeholder="98260 99999"]', '9826012345');
    await page.fill('input[placeholder="e.g. 104, Gulmohar Colony, Bhopal"]', 'E-3/42 Arera Colony, Bhopal');

    // Verify DPDP Consent
    const dpdpCheckbox = page.locator('#dpdp');
    await expect(dpdpCheckbox).toBeChecked();

    // Submit Complete Registration
    await page.click('button:has-text("Complete Registration")');

    // Land on Patient Dashboard
    await expect(page).toHaveURL(/\/patient\?registered=1/, { timeout: 15000 });
    await expect(page.locator('header')).toContainText('Live Queue Tracker');

    // Capture screenshot
    const screenshotPath = path.join(ARTIFACT_DIR, 'qa-15-patient-registration-flow.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test('27.3 Patient Sign Out clears session and Edge Middleware blocks unauthenticated protected routes', async ({ page }) => {
    test.setTimeout(45000);

    // 1. Log in as patient via Quick Select
    await page.goto('/login');
    await page.locator('button', { hasText: 'Patient Tracker' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/patient', { timeout: 20000 });

    // 2. Click Sign Out button
    const logoutBtn = page.getByTestId('btn-patient-logout');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // 3. Verify clean redirect to /login?logged_out=1 with confirmation notice
    await expect(page).toHaveURL(/\/login\?logged_out=1/, { timeout: 10000 });
    await expect(page.locator('text=You have been successfully signed out of MediBooking.in.')).toBeVisible();

    // 4. Test Edge Middleware blocks unauthenticated access to /doctor
    await page.goto('/doctor');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdoctor/, { timeout: 10000 });

    // 5. Test Edge Middleware blocks unauthenticated access to /admin
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin/, { timeout: 10000 });

    // Capture screenshot
    const screenshotPath = path.join(ARTIFACT_DIR, 'qa-16-logout-and-middleware-block.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test('27.4 Doctor & Receptionist Sign Out successfully terminates session without getting trapped in loop', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Doctor Login & Logout
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 20000 });

    // Doctor clicks Sign Out
    const docLogoutBtn = page.getByTestId('btn-doctor-logout');
    await expect(docLogoutBtn).toBeVisible();
    await docLogoutBtn.click();

    // Doctor successfully arrives on /login?logged_out=1
    await expect(page).toHaveURL(/\/login\?logged_out=1/, { timeout: 10000 });
    await expect(page.locator('text=You have been successfully signed out')).toBeVisible();

    // 2. Receptionist Login & Logout
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 20000 });

    // Receptionist clicks Sign Out
    const recLogoutBtn = page.getByTestId('btn-receptionist-logout');
    await expect(recLogoutBtn).toBeVisible();
    await recLogoutBtn.click();

    // Receptionist successfully arrives on /login?logged_out=1
    await expect(page).toHaveURL(/\/login\?logged_out=1/, { timeout: 10000 });
    await expect(page.locator('text=You have been successfully signed out')).toBeVisible();

    // Capture screenshot
    const screenshotPath = path.join(ARTIFACT_DIR, 'qa-17-doctor-and-receptionist-logout.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });
});
