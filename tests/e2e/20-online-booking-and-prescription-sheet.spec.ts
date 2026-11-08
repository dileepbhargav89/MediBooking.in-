import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 20 (Phase 61): Nominal Booking Fee (₹49), Pre-Consultation Prescription Sheet & Counter Custom Charges', () => {
  const apiBase = 'http://127.0.0.1:4000';

  test('20.1 REST API: Procedure catalog and consultation settlement with custom charges & 80/20 split', async ({ request }) => {
    // 1. Fetch Procedure Catalog
    const catalogRes = await request.get(`${apiBase}/api/v1/cashiering/procedure-catalog`);
    expect(catalogRes.status()).toBe(200);
    const catalogData = await catalogRes.json();
    expect(catalogData.success).toBe(true);
    expect(Array.isArray(catalogData.procedures)).toBe(true);
    expect(catalogData.procedures.some((p: any) => p.id === 'proc-ecg')).toBe(true);

    // 2. Settle Consultation Charges with ECG (+₹200) & Nebulization (+₹100)
    const settleRes = await request.post(`${apiBase}/api/v1/cashiering/settle-consultation-charges`, {
      data: {
        tokenNumber: 15,
        patientName: 'Ramesh Kumar',
        chamberNumber: 'CH-1',
        doctorName: 'Dr. Rajesh Sharma',
        consultationType: 'STANDARD',
        consultationFeeRupees: 600,
        selectedProcedureIds: ['proc-ecg', 'proc-nebulization'],
        paymentMethod: 'PAID_CASH',
      },
    });

    expect(settleRes.status()).toBe(200);
    const settleData = await settleRes.json();
    expect(settleData.success).toBe(true);
    expect(settleData.consultationFeeRupees).toBe(600);
    expect(settleData.proceduresTotalRupees).toBe(300);
    expect(settleData.grossTotalRupees).toBe(900);
    // Doctor Split: 80% of 600 (480) + 80% of 200 (160) + 60% of 100 (60) = 700
    expect(settleData.doctorShareRupees).toBe(700);
    expect(settleData.clinicShareRupees).toBe(200);
    expect(settleData.escPosReceiptText).toContain('BHOPAL CITYCARE POLYCLINIC');
    expect(settleData.escPosReceiptText).toContain('TOTAL CHARGES COLLECTED:          ₹900');
  });

  test('20.2 REST API: Pre-consultation prescription sheet generation with patient demographics and vitals', async ({ request }) => {
    const rxRes = await request.get(`${apiBase}/api/v1/public/bookings/appt-phase61-demo/prescription-sheet`);
    expect(rxRes.status()).toBe(200);
    const rxData = await rxRes.json();
    expect(rxData.success).toBe(true);
    expect(rxData.clinic.name).toContain('CityCare');
    expect(rxData.doctor.fullName).toContain('Rajesh Sharma');
    expect(rxData.doctor.registrationNumber).toContain('48291');
    expect(rxData.patient.fullName).toBe('Ramesh Kumar');
    expect(rxData.patient.ageYears).toBe(48);
    expect(rxData.patient.gender).toBe('MALE');
    expect(rxData.appointment.bookingFeeRupees).toBe(49);
    expect(rxData.appointment.bookingFeeStatus).toBe('PAID_ONLINE_UPI');
    expect(rxData.vitalsTemplate).toHaveProperty('bp');
    expect(rxData.vitalsTemplate).toHaveProperty('pulse');
  });

  test('20.3 UI Booking: Online booking charges nominal fee (₹49), collects demographics & shows prescription notice', async ({ page }) => {
    await page.goto('/dr/dr-rajesh-sharma-cardio');

    // 1. Select evening slot
    const slotButton = page.locator('button', { hasText: /05:30 PM|05:45 PM|06:00 PM/i }).first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // 2. Verify pricing transparency: ₹49 online booking vs ₹600 counter
    await expect(page.locator('text=Online Token Booking Fee:').first()).toBeVisible();
    await expect(page.locator('text=₹49 (Payable Now)')).toBeVisible();
    await expect(page.locator('text=Pay at Clinic Desk').first()).toBeVisible();

    // 3. Fill in Demographics
    await page.fill('[data-testid="input-patient-name"]', 'Deepak Verma');
    await page.fill('[data-testid="input-patient-age"]', '52');
    await page.selectOption('[data-testid="select-patient-gender"]', 'MALE');
    await page.fill('[data-testid="input-patient-mobile"]', '9826077777');
    await page.fill('[data-testid="input-patient-symptoms"]', 'Chest discomfort and shortness of breath');

    // 4. Pay ₹49 Nominal Fee via simulated UPI
    const payBtn = page.locator('[data-testid="btn-pay-booking-fee"]');
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // 5. Verify confirmation modal states
    await expect(page.locator('[data-testid="confirmed-token-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-booking-fee-paid"]')).toContainText('₹49 Booking Fee Paid Online');
    await expect(page.locator('text=Pre-Consultation Prescription Sheet Ready')).toBeVisible();
  });

  test('20.4 UI Reception: Receptionist prints Pre-Consultation Prescription Sheet before chamber entry', async ({ page }) => {
    // 1. Authenticate as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    // 2. Verify queue card shows booking fee badge and demographics
    await expect(page.locator('[data-testid="badge-booking-paid"]').first()).toBeVisible();
    await expect(page.locator('text=Ramesh Kumar (48M)').first()).toBeVisible();

    // 3. Open Pre-Consultation Prescription Sheet
    const printSheetBtn = page.locator('[data-testid="btn-print-rx-sheet"]').first();
    await expect(printSheetBtn).toBeVisible();
    await printSheetBtn.click();

    // 4. Verify Prescription Sheet Modal contents
    await expect(page.locator('[data-testid="modal-prescription-sheet"]')).toBeVisible();
    await expect(page.locator('text=BHOPAL CITYCARE POLYCLINIC').first()).toBeVisible();
    await expect(page.locator('text=MP-38492-NMC')).toBeVisible();
    await expect(page.locator('text=Compounder Pre-Consultation Vitals Recording')).toBeVisible();
    await expect(page.locator('text=BP (mmHg)')).toBeVisible();
    await expect(page.locator('text=SpO2 (%)')).toBeVisible();

    // 5. Trigger Print action
    const doPrintBtn = page.locator('[data-testid="btn-do-print-rx"]');
    await expect(doPrintBtn).toBeVisible();
    await doPrintBtn.click();
    await expect(page.locator('text=Prescription Sheet sent to Reception Printer')).toBeVisible();

    // 6. Close Modal
    await page.locator('[data-testid="btn-close-rx-modal"]').click();
    await expect(page.locator('[data-testid="modal-prescription-sheet"]')).not.toBeVisible();
  });

  test('20.5 UI Cashiering: Settle consultation & custom in-chamber procedure charges with split ledger preview', async ({ page }) => {
    // 1. Authenticate as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    // 2. Open Settle Consultation & Custom Charges Modal
    const settleBtn = page.locator('[data-testid="btn-settle-custom-charges"]').first();
    await expect(settleBtn).toBeVisible();
    await settleBtn.click();

    await expect(page.locator('[data-testid="modal-settle-charges"]')).toBeVisible();

    // 3. Check Initial Standard Fee (₹600)
    await expect(page.locator('[data-testid="settle-gross-total"]')).toContainText('₹600');

    // 4. Select In-Chamber Procedures (ECG +₹200 and Dressing +₹150)
    await page.locator('[data-testid="chk-proc-ecg"]').click();
    await expect(page.locator('[data-testid="settle-gross-total"]')).toContainText('₹800');

    await page.locator('[data-testid="chk-proc-dressing"]').click();
    await expect(page.locator('[data-testid="settle-gross-total"]')).toContainText('₹950');

    // 5. Confirm Settlement
    const confirmSettleBtn = page.locator('[data-testid="btn-confirm-settlement"]');
    await expect(confirmSettleBtn).toBeVisible();
    await confirmSettleBtn.click();

    // 6. Verify 80mm ESC/POS Thermal Cash Receipt is rendered
    await expect(page.locator('text=Consultation & Custom Charges Settled Successfully!')).toBeVisible();
    const thermalSlip = page.locator('[data-testid="settled-thermal-slip"]');
    await expect(thermalSlip).toBeVisible();
    await expect(thermalSlip).toContainText('BHOPAL CITYCARE POLYCLINIC');
    await expect(thermalSlip).toContainText('TOTAL CHARGES COLLECTED:          ₹950');
    await expect(thermalSlip).toContainText('Doctor Share');
    await expect(thermalSlip).toContainText('Polyclinic Facility Share');
  });
});
