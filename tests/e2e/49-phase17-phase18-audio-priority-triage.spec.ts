import { test, expect } from '@playwright/test';
import path from 'path';

const artifactDir = 'C:\\Users\\DILEEP BHARGAV\\.gemini\\antigravity\\brain\\3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test.describe('Phase 17 & Phase 18: Multi-Language Regional Audio Rx & Smart Geriatric/Infant Priority Triage Escalation', () => {

  test.beforeAll(async ({ request }) => {
    // Reset EMR Queue before test run to ensure clean baseline
    await request.post('http://127.0.0.1:4000/api/v1/emr/reset-queue');
  });

  // 1. PHASE 17 PART A: DOCTOR CHAMBER REGIONAL AUDIO PRESCRIPTION SYNTHESIS
  test('49.1 Doctor Chamber: Regional Multi-Language Audio Prescription Synthesis & WhatsApp Dispatch', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/doctor/, { timeout: 30000 });

    // Step B: Navigate to Doctor Chamber
    await page.goto('/doctor/chamber');
    await expect(page).toHaveURL('/doctor/chamber');

    // Wait for active patient dossier
    const activeDossier = page.getByTestId('patient-dossier-card');
    await expect(activeDossier).toBeVisible({ timeout: 15000 });
    await expect(activeDossier.locator('text=Kailash Prasad')).toBeVisible();

    // Step C: Open Regional Audio Prescription Guide Modal
    const audioRxBtn = page.getByTestId('btn-prescription-audio-guide');
    await expect(audioRxBtn).toBeVisible({ timeout: 10000 });
    await audioRxBtn.click();

    // Verify modal is open
    const audioModal = page.getByTestId('modal-prescription-audio-synthesis');
    await expect(audioModal).toBeVisible({ timeout: 10000 });

    // Step D: Verify Hindi default synthesis script
    const transcriptBox = page.getByTestId('text-audio-transcript-preview');
    await expect(transcriptBox).toBeVisible({ timeout: 10000 });
    await expect(transcriptBox).toContainText(/राजेश शर्मा|दवाइयाँ|नमस्ते/);

    // Step E: Switch to Marathi (MR)
    const marathiBtn = page.getByTestId('btn-audio-lang-MR');
    await expect(marathiBtn).toBeVisible();
    await marathiBtn.click();
    await expect(transcriptBox).toContainText(/नमस्कार|औषध|भोपाळ/);

    // Step F: Switch to Gujarati (GU)
    const gujaratiBtn = page.getByTestId('btn-audio-lang-GU');
    await expect(gujaratiBtn).toBeVisible();
    await gujaratiBtn.click();
    await expect(transcriptBox).toContainText(/નમસ્તે|દવા|ભોપાલ/);

    // Step G: Switch to English (EN)
    const englishBtn = page.getByTestId('btn-audio-lang-EN');
    await expect(englishBtn).toBeVisible();
    await englishBtn.click();
    await expect(transcriptBox).toContainText(/Bhopal City Care Polyclinic|Telma 40/);

    // Step H: Test Play/Pause audio playback & Waveform display
    const playPauseBtn = page.getByTestId('btn-play-pause-rx-audio');
    await expect(playPauseBtn).toBeVisible();
    await playPauseBtn.click();

    const waveformActive = page.getByTestId('waveform-audio-active');
    await expect(waveformActive).toBeVisible();

    // Step I: Test WhatsApp Audio Dispatch
    const dispatchWhatsAppBtn = page.getByTestId('btn-dispatch-audio-whatsapp');
    await expect(dispatchWhatsAppBtn).toBeVisible();
    await dispatchWhatsAppBtn.click();

    const whatsappToast = page.getByTestId('toast-audio-whatsapp-sent');
    await expect(whatsappToast).toBeVisible();
    await expect(whatsappToast).toContainText('dispatched to patient WhatsApp');

    // Capture High-Resolution Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-79-doctor-regional-audio-prescription-modal.png'),
      fullPage: true,
    });
  });

  // 2. PHASE 18 PART A: DOCTOR CHAMBER SMART GERIATRIC & INFANT PRIORITY TRIAGE ESCALATION
  test('49.2 Doctor Chamber: Smart Geriatric & Infant Priority Queue Triage Escalation', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Doctor
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Doctor Chamber' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/doctor/, { timeout: 30000 });

    // Step B: Navigate to Doctor Chamber
    await page.goto('/doctor/chamber');
    await expect(page).toHaveURL('/doctor/chamber');

    // Wait for queue strip
    const queueStrip = page.getByTestId('chamber-queue-strip');
    await expect(queueStrip).toBeVisible({ timeout: 15000 });

    // Verify Geriatric Priority badge on Token #12 (74M)
    const seniorBadge = page.getByTestId('badge-senior-priority');
    await expect(seniorBadge.first()).toBeVisible({ timeout: 10000 });
    await expect(seniorBadge.first()).toContainText('70+');

    // Verify Infant/Pediatric Priority badge on Token #15 (6M)
    const pediatricBadge = page.getByTestId('badge-pediatric-priority');
    await expect(pediatricBadge).toBeVisible({ timeout: 10000 });
    await expect(pediatricBadge).toContainText('Infant');

    // Step C: Escalate Infant Token #15 (High Fever 101.4°F)
    const escalateBtn15 = page.getByTestId('btn-escalate-priority-token-15');
    await expect(escalateBtn15).toBeVisible({ timeout: 10000 });
    await escalateBtn15.evaluate((el: HTMLElement) => el.click());

    // Verify Priority Escalation Toast
    const priorityToast = page.getByTestId('toast-priority-escalated');
    await expect(priorityToast).toBeVisible({ timeout: 10000 });
    await expect(priorityToast).toContainText('PRIORITY ESCALATED');
    await expect(priorityToast).toContainText('Token #15');

    // Verify Token #15 is now Next in peek banner
    const nextPeek = page.getByTestId('banner-next-patient-peek');
    await expect(nextPeek).toBeVisible();
    await expect(nextPeek).toContainText('#15');
    await expect(nextPeek).toContainText('Aarav Meena');

    // Capture High-Resolution Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-80-doctor-smart-geriatric-infant-priority-queue.png'),
      fullPage: true,
    });
  });

  // 3. PHASE 18 PART B: RECEPTION DESK GERIATRIC & INFANT TRIAGE ESCALATION
  test('49.3 Reception Desk: Smart Geriatric & Infant Triage Escalation Flagging', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/receptionist/, { timeout: 30000 });

    // Step B: Verify Senior & Infant Priority Badges on waiting tokens
    const infantBadge = page.getByTestId('badge-reception-infant-priority');
    await expect(infantBadge.first()).toBeVisible({ timeout: 15000 });

    // Step C: Trigger 1-Click Priority Triage Escalation on Infant Token #23 (Baby Kavita)
    const triageEscalateBtn = page.getByTestId('btn-reception-triage-escalate-23');
    await expect(triageEscalateBtn).toBeVisible({ timeout: 10000 });
    await triageEscalateBtn.click();

    // Verify Reception Priority Escalation Notification Banner
    const receptionNotice = page.getByTestId('toast-reception-escalated');
    await expect(receptionNotice).toBeVisible({ timeout: 10000 });
    await expect(receptionNotice).toContainText('PRIORITY ESCALATED: Token #23');

    // Capture High-Resolution Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-81-reception-priority-triage-escalation.png'),
      fullPage: true,
    });
  });

  // 4. PHASE 17 PART B: PATIENT UNIFIED HEALTH VAULT REGIONAL AUDIO PRESCRIPTION
  test('49.4 Patient Unified Dashboard: Health Vault Regional Audio Prescription Guide', async ({ page }) => {
    test.setTimeout(60000);

    // Step A: Login as Patient
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Patient Tracker' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/\/patient/, { timeout: 30000 });

    // Step B: Navigate explicitly to Unified Dashboard / Health Vault
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard');

    // Step C: Switch to Health Vault Tab
    const vaultTabBtn = page.getByTestId('tab-btn-vault');
    await expect(vaultTabBtn).toBeVisible({ timeout: 15000 });
    await vaultTabBtn.click();

    // Verify Health Record Document Card is visible
    const recordCard = page.getByTestId('health-record-card-rec-rx-kailash-01');
    await expect(recordCard).toBeVisible({ timeout: 15000 });

    // Step D: Open Audio Rx Guide Modal
    const listenAudioBtn = recordCard.getByTestId('btn-listen-rx-audio');
    await expect(listenAudioBtn).toBeVisible({ timeout: 10000 });
    await listenAudioBtn.click();

    // Verify Patient Audio Modal is visible
    const patientAudioModal = page.getByTestId('modal-patient-audio-guide');
    await expect(patientAudioModal).toBeVisible({ timeout: 10000 });

    // Verify Hindi transcript
    const audioTranscript = page.getByTestId('text-patient-audio-transcript');
    await expect(audioTranscript).toBeVisible();
    await expect(audioTranscript).toContainText(/नमस्ते|दवाइयाँ|Telma 40/);

    // Switch to Marathi
    const marathiLangBtn = page.getByTestId('btn-patient-audio-lang-MR');
    await expect(marathiLangBtn).toBeVisible();
    await marathiLangBtn.click();
    await expect(audioTranscript).toContainText(/नमस्कार|औषध/);

    // Step E: Trigger Audio Playback
    const playAudioBtn = page.getByTestId('btn-patient-play-audio');
    await expect(playAudioBtn).toBeVisible();
    await playAudioBtn.click();

    const waveformActive = page.getByTestId('waveform-patient-audio');
    await expect(waveformActive).toBeVisible();

    // Capture High-Resolution Screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-82-patient-health-vault-audio-prescription.png'),
      fullPage: true,
    });
  });

});
