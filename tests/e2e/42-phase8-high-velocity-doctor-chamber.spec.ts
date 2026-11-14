import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 8: High-Velocity Doctor Chamber Desk (1-Click Sign & Advance Queue)', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    // 0. Reset Fastify EMR Consultation Queue to Initial Clean State
    try {
      await page.request.post('http://127.0.0.1:4000/api/v1/emr/reset-queue');
    } catch (e) {
      console.warn('Could not reset EMR queue:', e);
    }

    // 1. Authenticate as Doctor via Single Sign-On Portal
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/doctor', { timeout: 15000 });

    // 2. Navigate to Chamber 1-Minute Rx Composer Desk
    await page.goto('/doctor/chamber');
    await page.waitForLoadState('networkidle');
  });

  // 42.1 CHAMBER IDENTITY, QUEUE STRIP & BUZZER ACTION
  test('42.1 Doctor Chamber Identity, Queue Strip, Next Patient Peek & Chamber Buzzer', async ({ page }) => {
    // 1. Verify Doctor & Clinic Credentials
    await expect(page.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(page.locator('text=NMC: MP-38492').first()).toBeVisible();
    await expect(page.locator('text=CH-3 • Bhopal City Care').first()).toBeVisible();

    // 2. Verify Chamber Queue Strip & Tokens
    const queueStrip = page.getByTestId('chamber-queue-strip');
    await expect(queueStrip).toBeVisible();

    const queueBar = page.getByTestId('chamber-queue-bar');
    await expect(queueBar).toBeVisible();
    await expect(queueBar.locator('text=Kailash Prasad')).toBeVisible();
    await expect(queueBar.locator('text=Sunita Verma')).toBeVisible();
    await expect(queueBar.locator('text=Rajesh Dubey')).toBeVisible();

    // 3. Verify Next Patient Peek Badge
    const nextPeek = page.getByTestId('banner-next-patient-peek');
    await expect(nextPeek).toBeVisible();
    await expect(nextPeek).toContainText('#13');
    await expect(nextPeek).toContainText('Sunita Verma');

    // 4. Test Chamber Repaging Buzzer
    const buzzerBtn = page.getByTestId('btn-chamber-buzzer');
    await expect(buzzerBtn).toBeVisible();
    await buzzerBtn.click();

    // Verify Buzzer Alert appears
    const buzzerAlert = page.getByTestId('toast-buzzer-alert');
    await expect(buzzerAlert).toBeVisible();
    await expect(buzzerAlert).toContainText('Calling Token #12 Kailash Prasad');

    // Capture Visual Artifact: Next Patient Preview & Chamber Buzzer
    await page.screenshot({
      path: path.join(artifactDir, 'qa-61-doctor-chamber-next-patient-preview.png'),
      fullPage: false,
    });
  });

  // 42.2 1-CLICK COMPLETE, SIGN & ADVANCE QUEUE
  test('42.2 1-Click Complete, Sign Prescription & Advance Queue to Next Token', async ({ page }) => {
    // 1. Initial State: Active patient is Token #12 Kailash Prasad
    const dossierCard = page.getByTestId('patient-dossier-card');
    await expect(dossierCard.locator('text=Token #12 • In Chamber')).toBeVisible();
    await expect(dossierCard.locator('text=Kailash Prasad')).toBeVisible();

    // 2. Apply Routine HTN Protocol Bundle
    const protocolBtn = page.getByTestId('bundle-btn-proto-htn-routine');
    await expect(protocolBtn).toBeVisible();
    await protocolBtn.click();

    // 3. Verify High-Velocity "Sign & Call Next" Action Button
    const signAndCallNextBtn = page.getByTestId('btn-sign-and-call-next');
    await expect(signAndCallNextBtn).toBeVisible();
    await expect(signAndCallNextBtn).toContainText('Sign & Call Next: Token #13');

    // 4. Click Sign & Call Next Token
    await signAndCallNextBtn.click();

    // 5. Verify Toast Banner Confirms Advancement
    const queueToast = page.getByTestId('toast-queue-advanced');
    await expect(queueToast).toBeVisible({ timeout: 10000 });
    await expect(queueToast).toContainText('Token #12 (Kailash Prasad) signed');
    await expect(queueToast).toContainText('Now In Chamber: Token #13 (Sunita Verma)');

    // 6. Verify Active Patient Dossier Automatically Updated to Token #13
    await expect(dossierCard.locator('text=Token #13 • In Chamber')).toBeVisible();
    await expect(dossierCard.locator('text=Sunita Verma')).toBeVisible();
    await expect(dossierCard.locator('text=46 Years / FEMALE')).toBeVisible();

    // 7. Verify Sunita Verma's Pre-Recorded Vitals Loaded (BP 122/78)
    const bpVital = page.getByTestId('vital-bp');
    await expect(bpVital).toContainText('122/78');

    // Capture Visual Artifact: Sign & Call Next Execution
    await page.screenshot({
      path: path.join(artifactDir, 'qa-62-doctor-sign-and-call-next-execution.png'),
      fullPage: false,
    });
  });

  // 42.3 MODAL-ASSISTED ADVANCE TO TOKEN #14
  test('42.3 Modal-Assisted Review & Fast-Forward Queue to Token #14', async ({ page }) => {
    // 0. Wait for Active Patient Dossier to Hydrate
    const dossierCard = page.getByTestId('patient-dossier-card');
    await expect(dossierCard.locator('text=Kailash Prasad')).toBeVisible({ timeout: 10000 });

    // 1. Advance to Token #13 first
    const signAndCallNextBtn = page.getByTestId('btn-sign-and-call-next');
    await signAndCallNextBtn.click();
    await expect(page.getByTestId('toast-queue-advanced')).toBeVisible({ timeout: 10000 });

    // 2. Open Preview Modal for Token #13
    const previewBtn = page.getByTestId('btn-sign-prescription');
    await previewBtn.click();

    // 3. Modal opens with Sunita Verma's prescription
    const previewModal = page.getByTestId('modal-prescription-preview');
    await expect(previewModal).toBeVisible();
    await expect(previewModal.locator('text=Sunita Verma')).toBeVisible();

    // 4. Click Modal's "Call Next Patient: Token #14" button
    const modalAdvanceBtn = page.getByTestId('btn-modal-sign-and-call-next');
    await expect(modalAdvanceBtn).toBeVisible();
    await expect(modalAdvanceBtn).toContainText('Token #14');
    await modalAdvanceBtn.click();

    // 5. Verify Modal closes and Token #14 Rajesh Dubey is now in chamber
    await expect(dossierCard.locator('text=Token #14 • In Chamber')).toBeVisible({ timeout: 10000 });
    await expect(dossierCard.locator('text=Rajesh Dubey')).toBeVisible();
    await expect(dossierCard.locator('text=58 Years / MALE')).toBeVisible();

    // 6. Verify Stage 2 HTN Vitals Loaded (BP 148/94)
    const bpVital = page.getByTestId('vital-bp');
    await expect(bpVital).toContainText('148/94');

    // Capture Visual Artifact: Advanced Patient (Token #14)
    await page.screenshot({
      path: path.join(artifactDir, 'qa-63-doctor-chamber-advanced-patient.png'),
      fullPage: false,
    });
  });
});
