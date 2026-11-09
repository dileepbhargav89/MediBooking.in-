import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'tests', 'reports', 'screenshots');

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test.describe('E2E Workflow 22: Multi-Clinic, Multi-Doctor & Multi-User QA Verification', () => {
  test('22.1 Landing Page displays Bhopal Polyclinic Network and Specialist Directory', async ({ page }) => {
    await page.goto('/');

    // Check directory header
    await expect(page.locator('text=Bhopal Polyclinic Network & Specialist Chambers')).toBeVisible();
    await expect(page.locator('text=10 Pilot Polyclinics Active')).toBeVisible();

    // Verify multiple clinics are rendered
    await expect(page.locator('text=CityCare Polyclinic').first()).toBeVisible();
    await expect(page.locator('text=Narmada Health & Specialty').first()).toBeVisible();
    await expect(page.locator('text=Kolar Prime MediChambers').first()).toBeVisible();
    await expect(page.locator('text=Bhopal Care Daycare').first()).toBeVisible();

    // Check doctors listed
    await expect(page.locator('text=Dr. Alok Verma')).toBeVisible();
    await expect(page.locator('text=Dr. Vivek Saxena')).toBeVisible();
    await expect(page.locator('text=Dr. Manish Dubey')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa-01-directory-landing.png'), fullPage: true });
  });

  test('22.2 Patient books online token for Dr. Alok Verma (Neurologist at Narmada Health, Arera Colony)', async ({ page }) => {
    await page.goto('/dr/dr-alok-verma-neuro');

    // Verify doctor header
    await expect(page.locator('h1')).toContainText('Dr. Alok Verma');
    await expect(page.locator('text=Verified Practitioner')).toBeVisible();
    await expect(page.locator('text=MPMC-39182')).toBeVisible();
    await expect(page.locator('text=Senior Neurologist & Stroke Specialist')).toBeVisible();

    // Verify practice venue
    await expect(page.locator('text=Narmada Health & Specialty Polyclinic').first()).toBeVisible();
    await expect(page.locator('text=₹800').first()).toBeVisible();

    // Select an evening slot
    const slotButton = page.locator('button', { hasText: /05:30 PM|06:00 PM|06:15 PM/i }).first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // Verify slot lock
    await expect(page.locator('text=Slot held exclusively for you')).toBeVisible();

    // Fill in patient details
    await page.fill('input[placeholder*="Ramesh Kumar"]', 'Anita Mehra');
    await page.fill('input[placeholder*="98260"]', '9826077777');

    // Confirm booking
    const confirmBtn = page.locator('button', { hasText: /Confirm Appointment/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify confirmed appointment
    await expect(page.locator('text=Appointment Confirmed')).toBeVisible();
    await expect(page.locator('text=Anita Mehra')).toBeVisible();
    await expect(page.locator('text=Dr. Alok Verma').first()).toBeVisible();
    await expect(page.getByText('CH-1').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa-02-booking-dr-alok-verma.png') });
  });

  test('22.3 Patient books online token for Dr. Vivek Saxena (Physician at Kolar Prime, Kolar Road)', async ({ page }) => {
    await page.goto('/dr/dr-vivek-saxena-genmed');

    // Verify doctor header
    await expect(page.locator('h1')).toContainText('Dr. Vivek Saxena');
    await expect(page.locator('text=Verified Practitioner')).toBeVisible();
    await expect(page.locator('text=MPMC-42109')).toBeVisible();
    await expect(page.locator('text=Consultant Physician & Diabetologist')).toBeVisible();

    // Verify practice venue
    await expect(page.locator('text=Kolar Prime MediChambers').first()).toBeVisible();
    await expect(page.locator('text=₹500').first()).toBeVisible();

    // Select slot
    const slotButton = page.locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM/i }).first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // Fill details
    await page.fill('input[placeholder*="Ramesh Kumar"]', 'Deepak Malviya');
    await page.fill('input[placeholder*="98260"]', '9826066666');

    // Confirm booking
    const confirmBtn = page.locator('button', { hasText: /Confirm Appointment/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify confirmed appointment
    await expect(page.locator('text=Appointment Confirmed')).toBeVisible();
    await expect(page.locator('text=Deepak Malviya')).toBeVisible();
    await expect(page.locator('text=Dr. Vivek Saxena').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa-03-booking-dr-vivek-saxena.png') });
  });

  test('22.4 Waiting Room TV displays correct clinic branding and chamber roster across multiple clinics', async ({ page }) => {
    // 1. Check Narmada Health TV
    await page.goto('/tv/narmada-health-arera-bhopal');
    await expect(page.locator('h1')).toContainText('Narmada Health & Specialty Polyclinic');
    await expect(page.locator('text=Arera Colony E-3, Bhopal')).toBeVisible();
    await expect(page.locator('text=Dr. Alok Verma')).toBeVisible();
    await expect(page.locator('text=Neurologist')).toBeVisible();
    await expect(page.locator('text=CH-1')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa-04-tv-narmada-health.png') });

    // 2. Check Kolar Prime TV
    await page.goto('/tv/kolar-prime-sarvadharam-bhopal');
    await expect(page.locator('h1')).toContainText('Kolar Prime MediChambers');
    await expect(page.locator('text=Kolar Road, Bhopal')).toBeVisible();
    await expect(page.locator('text=Dr. Vivek Saxena')).toBeVisible();
    await expect(page.locator('text=Consultant Physician')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa-05-tv-kolar-prime.png') });
  });

  test('22.5 Staff Login with Multi-Clinic Personas routes seamlessly to respective portals', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    // Verify multi-clinic personas banner
    await expect(page.locator('text=Multi-Clinic Demo Personas')).toBeVisible();

    // Click Narmada Reception persona
    const narmadaRecBtn = page.locator('button', { hasText: 'Narmada Reception' });
    await expect(narmadaRecBtn).toBeVisible();
    await narmadaRecBtn.click();

    // handleQuickSelect initiates OTP request and transitions directly to OTP step
    const devLoginBtn = page.locator('button', { hasText: /Instant Dev Login/i });
    await expect(devLoginBtn).toBeVisible({ timeout: 10000 });
    await devLoginBtn.click();

    // Should redirect to receptionist desk
    await page.waitForURL('**/receptionist**');
    await expect(page).toHaveURL(/receptionist/);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa-06-narmada-reception-portal.png') });
  });

  test('22.6 Patient Queue Tracker dynamically reflects clinic and doctor from deep link', async ({ page }) => {
    await page.goto('/patient?token=18&chamber=CH-1&doctor=Dr.%20Alok%20Verma&clinic=Narmada%20Health%20%26%20Specialty');

    const tokenDisplay = page.getByTestId('assigned-token-number');
    await expect(tokenDisplay).toBeVisible({ timeout: 10000 });
    await expect(tokenDisplay).toHaveText('#18');
    await expect(page.locator('text=Dr. Alok Verma').first()).toBeVisible();
    await expect(page.locator('text=Narmada Health & Specialty').first()).toBeVisible();
    await expect(page.getByText('CH-1').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'qa-07-patient-tracker-multiclinic.png') });
  });
});

