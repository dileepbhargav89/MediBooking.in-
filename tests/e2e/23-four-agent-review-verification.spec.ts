import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

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

test.describe('E2E Workflow 23: 4-Agent Review, Debug & Retest Suite', () => {
  test('23.1 Agent 1 (Business-Oriented): Nominal ₹49 Booking, Transparent Remainder & Dynamic Patient Attribution', async ({ page }) => {
    test.setTimeout(45000);
    await page.context().clearCookies();

    // 1. Visit Dr. Alok Verma (Neurologist at Narmada Health, Arera Colony)
    await page.goto('/dr/dr-alok-verma-neuro');
    await expect(page.locator('h1')).toContainText('Dr. Alok Verma');

    // 2. Select an available slot
    const slotBtn = page.locator('button:has-text("10:00 AM")').first();
    await slotBtn.click();

    // 3. Verify Nominal ₹49 Booking vs Counter Fee Breakdown
    await expect(page.locator('text=Online Token Booking Fee:')).toBeVisible();
    await expect(page.locator('text=₹49 (Payable Now)')).toBeVisible();
    await expect(page.locator('text=Doctor Consultation Fee:')).toBeVisible();
    await expect(page.locator('text=₹800 (Pay at Clinic Desk)')).toBeVisible();

    // 4. Fill Patient Details
    await page.fill('[data-testid="input-patient-name"]', 'Deepak Agrawal');
    await page.fill('[data-testid="input-patient-age"]', '42');
    await page.selectOption('[data-testid="select-patient-gender"]', 'MALE');
    await page.fill('[data-testid="input-patient-mobile"]', '9826077777');
    await page.fill('[data-testid="input-patient-symptoms"]', 'Frequent migraine and tension headache');

    // 5. Pay ₹49 Booking Fee
    await page.click('[data-testid="btn-pay-booking-fee"]');
    await expect(page.locator('text=Appointment Confirmed!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="badge-booking-fee-paid"]')).toBeVisible();

    // Capture Business Agent screenshot
    const shotPath = 'tests/reports/screenshots/qa-08-business-agent-nominal-booking.png';
    await page.screenshot({ path: shotPath });
    copyToArtifact(shotPath, 'qa-08-business-agent-nominal-booking.png');

    // 6. Verify Track Live Queue link includes patient parameter
    const trackLink = page.locator('a:has-text("Track Live Queue Position")');
    const href = await trackLink.getAttribute('href');
    expect(href).toContain('patient=Deepak%20Agrawal');
    expect(href).toContain('doctor=Dr.%20Alok%20Verma');
  });

  test('23.2 Agent 2 (Patient-Oriented): Live Tracker Displays Dynamic Patient & Doctor NMC Identity', async ({ page }) => {
    test.setTimeout(45000);
    await page.context().clearCookies();

    // Navigate directly with deep-link query parameters
    await page.goto('/patient?token=19&chamber=CH-1&doctor=Dr.%20Alok%20Verma&clinic=Narmada%20Health%20%26%20Diagnostics&patient=Deepak%20Agrawal');

    // Verify Patient Name is attributed dynamically
    await expect(page.locator('text=Deepak Agrawal')).toBeVisible();
    await expect(page.locator('[data-testid="assigned-token-number"]')).toHaveText('#19');
    await expect(page.getByText('Dr. Alok Verma', { exact: true })).toBeVisible();

    // Verify Prescription Ready banner references Dr. Alok Verma dynamically (not hardcoded Sharma)
    const rxBanner = page.locator('text=Your prescription slip with Dr. Alok Verma');
    await expect(rxBanner).toBeVisible();
    const rxBannerText = await rxBanner.textContent();
    expect(rxBannerText).toContain('Dr. Alok Verma');
    expect(rxBannerText).not.toContain('Dr. Rajesh Sharma');

    // Verify WhatsApp assistant is interactive
    const waContainer = page.locator('[data-testid="wa-chat-container"]');
    await expect(waContainer).toBeVisible();
    await page.locator('button:has-text("STATUS")').click();
    await expect(page.locator('text=Token Status')).toBeVisible({ timeout: 8000 });

    // Capture Patient Agent screenshot
    const shotPath = 'tests/reports/screenshots/qa-09-patient-agent-dynamic-tracker.png';
    await page.screenshot({ path: shotPath });
    copyToArtifact(shotPath, 'qa-09-patient-agent-dynamic-tracker.png');
  });

  test('23.3 Agent 3 (Doctor-Oriented): Chamber Desk Rx Sheet View & In-Chamber Procedures Reset', async ({ page }) => {
    test.setTimeout(45000);
    await page.context().clearCookies();

    // 1. Login as Doctor
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 30000 });

    // 2. Verify Doctor Chamber Desk loaded
    await expect(page.locator('header')).toContainText('Chamber Consultation Desk');

    // 3. Test View Pre-Consultation Rx Sheet Modal
    const viewRxBtn = page.locator('button:has-text("View Rx Sheet")');
    await expect(viewRxBtn).toBeVisible();
    await viewRxBtn.click();

    // Verify Modal content
    await expect(page.locator('text=📋 Pre-Consultation Prescription Sheet')).toBeVisible();
    await expect(page.locator('text=Recorded Vitals (By Reception Compounder):')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('128/84 mmHg')).toBeVisible();

    // Capture Doctor Agent screenshot
    const shotPath = 'tests/reports/screenshots/qa-10-doctor-agent-rx-sheet-modal.png';
    await page.screenshot({ path: shotPath });
    copyToArtifact(shotPath, 'qa-10-doctor-agent-rx-sheet-modal.png');

    await page.locator('button:has-text("Close")').last().click();

    // 4. Verify Procedure Selection and reset on next patient
    const ecgCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(ecgCheckbox).toBeChecked(); // Initially proc-ecg is checked for patient 14

    // 5. Complete consultation & call next token
    await page.click('button:has-text("✓ Complete & Call Next Token")');
    await expect(page.locator('text=Token #14 Completed!')).toBeVisible();

    // Verify next patient (#15) has procedures cleared (no billing leakage!)
    await expect(page.locator('div').filter({ hasText: /^#15$/ })).toBeVisible();
    const ecgCheckboxAfter = page.locator('input[type="checkbox"]').first();
    await expect(ecgCheckboxAfter).not.toBeChecked();
  });

  test('23.4 Agent 4 (Clinic Receptionist): 1-Click Rx Sheet from Receipt & Custom Procedure Cashiering', async ({ page }) => {
    test.setTimeout(45000);
    await page.context().clearCookies();

    // 1. Login as Receptionist
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 30000 });

    // 2. Initiate Rapid Walk-In Intake
    await page.click('button:has-text("Walk-In Intake")');
    await page.fill('input[placeholder="98260 12345"]', '9826088888');
    await page.fill('input[placeholder="e.g. Ramesh Kumar"]', 'Kavita Verma');
    await page.click('button:has-text("Allocate Token & Generate Receipt")');

    // 3. Receipt modal opens - verify 1-Click Print Pre-Consultation Rx Sheet button
    const rxSheetBtn = page.locator('button:has-text("Print Pre-Consultation Rx Sheet (A4)")');
    await expect(rxSheetBtn).toBeVisible();

    // Capture Receptionist Agent screenshot
    const shotPath = 'tests/reports/screenshots/qa-11-receptionist-agent-1click-rx-print.png';
    await page.screenshot({ path: shotPath });
    copyToArtifact(shotPath, 'qa-11-receptionist-agent-1click-rx-print.png');

    await rxSheetBtn.click();

    // 4. Pre-Consultation Rx Sheet Modal should open immediately
    await expect(page.locator('[data-testid="modal-prescription-sheet"]')).toBeVisible();
    await expect(page.locator('text=A4 Letterhead')).toBeVisible();
    await expect(page.locator('text=80mm Thermal (Zero-Ink)')).toBeVisible();
    await page.locator('[data-testid="btn-close-rx-modal"]').click();

    // 5. Verify Consultation Settle Modal for an existing token
    const settleBtn = page.locator('[data-testid="btn-settle-custom-charges"]').first();
    await settleBtn.click();
    await expect(page.locator('[data-testid="modal-settle-charges"]')).toBeVisible();

    // Select ECG procedure (+₹200)
    await page.locator('label:has-text("12-Lead ECG with Rhythm Strip")').click();
    await expect(page.locator('text=Doctor Share:')).toBeVisible();

    // Confirm Settlement
    await page.click('[data-testid="btn-confirm-settlement"]');
    await expect(page.locator('[data-testid="settled-thermal-slip"]')).toBeVisible();
    await page.locator('button:has-text("Done")').click();
  });
});
