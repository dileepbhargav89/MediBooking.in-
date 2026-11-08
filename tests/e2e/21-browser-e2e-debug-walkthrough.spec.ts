import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';
const SCREENSHOT_DIR = path.join(process.cwd(), 'tests/reports/screenshots');

// Ensure output dirs exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface BrowserDebugReport {
  timestamp: string;
  journeys: {
    name: string;
    url: string;
    durationMs: number;
    consoleLogs: { type: string; text: string }[];
    pageErrors: string[];
    networkFailures: { url: string; status?: number; error?: string }[];
    screenshot: string;
    status: 'PASSED' | 'FAILED';
    assertions: string[];
  }[];
}

const debugReport: BrowserDebugReport = {
  timestamp: new Date().toISOString(),
  journeys: [],
};

async function copyToArtifacts(filename: string) {
  const src = path.join(SCREENSHOT_DIR, filename);
  const dest = path.join(ARTIFACT_DIR, filename);
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  } catch (e) {
    // ignore copy failure
  }
}

test.describe('E2E Workflow 21: Full Browser End-to-End Walkthrough & Debugging Suite', () => {
  test.afterAll(async () => {
    fs.writeFileSync(
      path.join(process.cwd(), 'tests/reports/browser-debugging-report.json'),
      JSON.stringify(debugReport, null, 2)
    );
  });

  test('21.1 Browser Debug Journey: Public Doctor Discovery & Nominal ₹49 Booking', async ({ page }) => {
    const consoleLogs: { type: string; text: string }[] = [];
    const pageErrors: string[] = [];
    const networkFailures: { url: string; status?: number; error?: string }[] = [];
    const assertions: string[] = [];
    const startTime = Date.now();

    page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push({ url: res.url(), status: res.status() });
      }
    });

    // 1. Visit Doctor profile
    await page.goto('/dr/dr-rajesh-sharma-cardio');
    await expect(page.locator('h1')).toContainText('Dr. Rajesh Sharma');
    await expect(page.locator('text=NMC: MP-38492')).toBeVisible();
    assertions.push('Doctor profile and NMC credential MP-38492 verified');

    // 2. Select Evening Slot
    const slotButton = page.locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM/i }).first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();
    assertions.push('Selected available evening consultation slot');

    // 3. Select quick symptom chip
    const chipBtn = page.locator('button:has-text("+ Routine Checkup")').first();
    if (await chipBtn.isVisible()) {
      await chipBtn.click();
      assertions.push('Clicked 1-click + Routine Checkup symptom chip');
    }

    // 4. Verify pricing transparency: ₹49 online booking vs ₹600 counter
    await expect(page.locator('text=Online Token Booking Fee:').first()).toBeVisible();
    await expect(page.locator('text=₹49 (Payable Now)')).toBeVisible();
    await expect(page.locator('text=Pay at Clinic Desk').first()).toBeVisible();
    assertions.push('Verified ₹49 nominal fee and counter payment breakdown');

    // 5. Fill Demographics
    await page.fill('[data-testid="input-patient-name"]', 'Deepak Verma');
    await page.fill('[data-testid="input-patient-age"]', '52');
    await page.selectOption('[data-testid="select-patient-gender"]', 'MALE');
    await page.fill('[data-testid="input-patient-mobile"]', '9826077777');
    assertions.push('Filled patient intake demographics via data-testids');

    // Capture booking intake form screenshot
    const screenshotName = 'debug-01-doctor-booking.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshotName), fullPage: true });
    await copyToArtifacts(screenshotName);

    // 6. Pay ₹49 Nominal Fee via BharatQR
    const payBtn = page.locator('[data-testid="btn-pay-booking-fee"]');
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // 7. Verify confirmation modal states
    await expect(page.locator('[data-testid="confirmed-token-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-booking-fee-paid"]')).toContainText('₹49 Booking Fee Paid Online');
    await expect(page.locator('text=Pre-Consultation Prescription Sheet Ready')).toBeVisible();
    assertions.push('Booking confirmed with live token allocated and pre-consultation notice');

    // Capture booking confirmation screenshot
    const confirmScreenshot = 'debug-01b-booking-confirmation.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, confirmScreenshot), fullPage: false });
    await copyToArtifacts(confirmScreenshot);

    debugReport.journeys.push({
      name: 'Journey 1: Public Doctor Booking & Nominal Intake',
      url: '/dr/dr-rajesh-sharma-cardio',
      durationMs: Date.now() - startTime,
      consoleLogs,
      pageErrors,
      networkFailures,
      screenshot: screenshotName,
      status: pageErrors.length === 0 ? 'PASSED' : 'FAILED',
      assertions,
    });

    expect(pageErrors.length).toBe(0);
  });

  test('21.2 Browser Debug Journey: Receptionist Front Desk, Pre-Consultation Rx Sheet & Cashiering', async ({ page }) => {
    const consoleLogs: { type: string; text: string }[] = [];
    const pageErrors: string[] = [];
    const networkFailures: { url: string; status?: number; error?: string }[] = [];
    const assertions: string[] = [];
    const startTime = Date.now();

    page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push({ url: res.url(), status: res.status() });
      }
    });

    // 1. Authenticate as Receptionist via Quick Role
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });
    assertions.push('Navigated to /receptionist via Reception Desk Quick Role');

    // 2. Verify Cash Drawer & Queues
    await expect(page.locator('text=Central Reception Desk').first()).toBeVisible();
    await expect(page.locator('text=Cash In Drawer').first()).toBeVisible();
    assertions.push('Cash drawer metrics verified');

    // 3. Open Pre-Consultation Prescription Sheet
    const printSheetBtn = page.locator('[data-testid="btn-print-rx-sheet"]').first();
    await expect(printSheetBtn).toBeVisible();
    await printSheetBtn.click();

    // Verify Dual Format Toggle & Vitals recording
    await expect(page.locator('[data-testid="modal-prescription-sheet"]')).toBeVisible();
    await expect(page.locator('text=BHOPAL CITYCARE POLYCLINIC').first()).toBeVisible();
    await expect(page.locator('text=Compounder Pre-Consultation Vitals Recording')).toBeVisible();
    assertions.push('Pre-Consultation Prescription Sheet modal rendered with vitals recording');

    // Capture Prescription Sheet modal screenshot
    const rxScreenshot = 'debug-02-rx-sheet-modal.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, rxScreenshot) });
    await copyToArtifacts(rxScreenshot);

    // Close Modal
    await page.locator('[data-testid="btn-close-rx-modal"]').click();
    await expect(page.locator('[data-testid="modal-prescription-sheet"]')).not.toBeVisible();

    // 4. Open Settle Custom Charges modal
    const settleBtn = page.locator('[data-testid="btn-settle-custom-charges"]').first();
    await expect(settleBtn).toBeVisible();
    await settleBtn.click();

    await expect(page.locator('[data-testid="modal-settle-charges"]')).toBeVisible();
    await expect(page.locator('[data-testid="settle-gross-total"]')).toContainText('₹600');
    assertions.push('Settle Custom Charges modal verified with gross total');

    // Select In-Chamber Procedures (ECG +₹200)
    await page.locator('[data-testid="chk-proc-ecg"]').click();
    await expect(page.locator('[data-testid="settle-gross-total"]')).toContainText('₹800');
    assertions.push('Added 12-Lead ECG procedure (+₹200)');

    // Capture Settle Modal screenshot
    const settleScreenshot = 'debug-03-settle-custom-charges.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, settleScreenshot) });
    await copyToArtifacts(settleScreenshot);

    // Confirm Settlement
    const confirmSettleBtn = page.locator('[data-testid="btn-confirm-settlement"]');
    await expect(confirmSettleBtn).toBeVisible();
    await confirmSettleBtn.click();

    // Verify 80mm ESC/POS Thermal Cash Receipt is rendered
    await expect(page.locator('text=Consultation & Custom Charges Settled Successfully!')).toBeVisible();
    const thermalSlip = page.locator('[data-testid="settled-thermal-slip"]');
    await expect(thermalSlip).toBeVisible();
    await expect(thermalSlip).toContainText('Doctor Share');
    await expect(thermalSlip).toContainText('Polyclinic Facility Share');
    assertions.push('Cashiering settled with itemized thermal slip and 80/20 split');

    // Capture Thermal Receipt Screenshot
    const slipScreenshot = 'debug-03b-thermal-receipt.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, slipScreenshot) });
    await copyToArtifacts(slipScreenshot);

    // Close Settle modal
    const closeSettleBtn = page.locator('button:has-text("✕")').first();
    if (await closeSettleBtn.isVisible()) {
      await closeSettleBtn.click();
    }

    // Capture Full Receptionist Screen
    const receptionScreenshot = 'debug-04-receptionist-desk.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, receptionScreenshot), fullPage: true });
    await copyToArtifacts(receptionScreenshot);

    debugReport.journeys.push({
      name: 'Journey 2: Receptionist Front Desk & Cashiering',
      url: '/receptionist',
      durationMs: Date.now() - startTime,
      consoleLogs,
      pageErrors,
      networkFailures,
      screenshot: receptionScreenshot,
      status: pageErrors.length === 0 ? 'PASSED' : 'FAILED',
      assertions,
    });

    expect(pageErrors.length).toBe(0);
  });

  test('21.3 Browser Debug Journey: Doctor Chamber Desk, Quick Rx & Session Velocity', async ({ page }) => {
    const consoleLogs: { type: string; text: string }[] = [];
    const pageErrors: string[] = [];
    const networkFailures: { url: string; status?: number; error?: string }[] = [];
    const assertions: string[] = [];
    const startTime = Date.now();

    page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push({ url: res.url(), status: res.status() });
      }
    });

    // 1. Authenticate as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 15000 });
    assertions.push('Navigated to /doctor via Doctor Chamber Quick Role');

    // 2. Verify Session Velocity & Earnings
    await expect(page.locator('header')).toContainText('Dr. Rajesh Sharma');
    await expect(page.locator('text=Doctor Net Share').first()).toBeVisible();
    assertions.push('Doctor session velocity and earnings card visible');

    // 3. Verify Pre-Consultation Physical Sheet Notice
    await expect(page.locator('text=Pre-Consultation Prescription Sheet Ready on Desk').first()).toBeVisible();
    assertions.push('Physical prescription sheet notice visible in chamber desk');

    // 4. Test 1-Click Quick Rx Chips
    const rxChip = page.locator('button:has-text("+ Tab. Telmisartan 40mg OD")').first();
    if (await rxChip.isVisible()) {
      await rxChip.click();
      assertions.push('Clicked Quick Rx chip');
    }

    // Capture Doctor Chamber Screenshot
    const doctorScreenshot = 'debug-05-doctor-chamber.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, doctorScreenshot), fullPage: true });
    await copyToArtifacts(doctorScreenshot);

    debugReport.journeys.push({
      name: 'Journey 3: Doctor Chamber Consultation Desk',
      url: '/doctor',
      durationMs: Date.now() - startTime,
      consoleLogs,
      pageErrors,
      networkFailures,
      screenshot: doctorScreenshot,
      status: pageErrors.length === 0 ? 'PASSED' : 'FAILED',
      assertions,
    });

    expect(pageErrors.length).toBe(0);
  });

  test('21.4 Browser Debug Journey: Waiting Room 4K TV Screen & Polyclinic Ancillary Ticker', async ({ page }) => {
    const consoleLogs: { type: string; text: string }[] = [];
    const pageErrors: string[] = [];
    const networkFailures: { url: string; status?: number; error?: string }[] = [];
    const assertions: string[] = [];
    const startTime = Date.now();

    page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push({ url: res.url(), status: res.status() });
      }
    });

    // 1. Visit TV screen with the verified clinic slug
    await page.goto('/tv/citycare-mpnagar-bhopal');
    await expect(page.locator('h1')).toContainText('Bhopal City Care Polyclinic');
    assertions.push('TV Screen loaded with Bhopal City Care Polyclinic header');

    // 2. Verify Chambers Grid
    await expect(page.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    assertions.push('Chamber 1 card rendered with Dr. Rajesh Sharma');

    // 3. Verify Promotional Service Ticker
    await expect(page.locator('text=CLINIC SERVICES').first()).toBeVisible();
    await expect(page.locator('text=12-Lead ECG').first()).toBeVisible();
    assertions.push('Polyclinic diagnostic services ticker verified');

    // Capture TV screen
    const tvScreenshot = 'debug-06-tv-screen.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, tvScreenshot), fullPage: true });
    await copyToArtifacts(tvScreenshot);

    debugReport.journeys.push({
      name: 'Journey 4: Waiting Room 4K TV Screen',
      url: '/tv/citycare-mpnagar-bhopal',
      durationMs: Date.now() - startTime,
      consoleLogs,
      pageErrors,
      networkFailures,
      screenshot: tvScreenshot,
      status: pageErrors.length === 0 ? 'PASSED' : 'FAILED',
      assertions,
    });

    expect(pageErrors.length).toBe(0);
  });

  test('21.5 Browser Debug Journey: Patient Live Tracker & Two-Way WhatsApp Assistant', async ({ page }) => {
    const consoleLogs: { type: string; text: string }[] = [];
    const pageErrors: string[] = [];
    const networkFailures: { url: string; status?: number; error?: string }[] = [];
    const assertions: string[] = [];
    const startTime = Date.now();

    page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push({ url: res.url(), status: res.status() });
      }
    });

    // 1. Authenticate as Patient
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Patient Tracker' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/.*\/patient/, { timeout: 15000 });

    // 2. Open Patient tracker with token deep-link
    await page.goto('/patient?token=18&chamber=CH-1');
    const tokenDisplay = page.getByTestId('assigned-token-number');
    await expect(tokenDisplay).toBeVisible({ timeout: 10000 });
    await expect(tokenDisplay).toHaveText('#18');
    assertions.push('Token #18 tracker loaded with assigned chamber');

    // 3. Verify Pre-consultation notice & WhatsApp Assistant
    await expect(page.locator('text=Pre-Consultation Prescription Sheet Prepared').first()).toBeVisible();
    await expect(page.locator('text=₹49 BOOKING PAID').first()).toBeVisible();
    assertions.push('Pre-Consultation Rx sheet prepared banner visible');

    // 4. Click WhatsApp quick chip
    const statusChip = page.locator('button:has-text("📊 Check Live Status")').first();
    if (await statusChip.isVisible()) {
      await statusChip.click();
      assertions.push('Clicked WhatsApp Live Status chip');
    }

    // Capture Patient Tracker Screen
    const patientScreenshot = 'debug-07-patient-tracker.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, patientScreenshot), fullPage: true });
    await copyToArtifacts(patientScreenshot);

    debugReport.journeys.push({
      name: 'Journey 5: Patient Live Queue Tracker & WhatsApp Assistant',
      url: '/patient?token=18&chamber=CH-1',
      durationMs: Date.now() - startTime,
      consoleLogs,
      pageErrors,
      networkFailures,
      screenshot: patientScreenshot,
      status: pageErrors.length === 0 ? 'PASSED' : 'FAILED',
      assertions,
    });

    expect(pageErrors.length).toBe(0);
  });

  test('21.6 Browser Debug Journey: Clinic Admin Revenue Split & Nominal Booking Policy', async ({ page }) => {
    const consoleLogs: { type: string; text: string }[] = [];
    const pageErrors: string[] = [];
    const networkFailures: { url: string; status?: number; error?: string }[] = [];
    const assertions: string[] = [];
    const startTime = Date.now();

    page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) {
        networkFailures.push({ url: res.url(), status: res.status() });
      }
    });

    // 1. Authenticate as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 15000 });
    assertions.push('Navigated to /admin via Clinic Admin Quick Role');

    // 2. Verify Nominal Booking Engine Policy Badge on default tab
    await expect(page.locator('text=Clinic-First Nominal Booking Fee & Pre-Consultation Prescription Engine Active').first()).toBeVisible();
    assertions.push('Nominal booking policy badge verified on main affiliations view');

    // 3. Switch to End-of-Day Cash Drawer Reconciliation Tab
    const cashTab = page.locator('button', { hasText: /End-of-Day Cash Drawer Reconciliation/i });
    if (await cashTab.isVisible()) {
      await cashTab.click();
      await expect(page.locator('text=System Expected Cash').first()).toBeVisible();
      assertions.push('End-of-day cash drawer reconciliation verified');
    }

    // Capture Admin Portal Screen
    const adminScreenshot = 'debug-08-clinic-admin.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, adminScreenshot), fullPage: true });
    await copyToArtifacts(adminScreenshot);

    debugReport.journeys.push({
      name: 'Journey 6: Clinic Admin Revenue Split & Governance',
      url: '/admin',
      durationMs: Date.now() - startTime,
      consoleLogs,
      pageErrors,
      networkFailures,
      screenshot: adminScreenshot,
      status: pageErrors.length === 0 ? 'PASSED' : 'FAILED',
      assertions,
    });

    expect(pageErrors.length).toBe(0);
  });
});
