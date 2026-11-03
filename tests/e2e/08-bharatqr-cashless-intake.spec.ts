import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 8 (Phase 49): Dynamic BharatQR UPI Cashless Counter Intake', () => {
  const apiBase = 'http://127.0.0.1:4000';

  test.beforeEach(async ({ page }) => {
    // Authenticate as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist');
  });

  test('8.1 Walk-In Intake with UPI QR payment launches BharatQR modal, verifies scan & pay, and updates ledger', async ({ page }) => {
    // 1. Click Walk-in Intake button
    const intakeBtn = page.locator('button', { hasText: '+ Walk-In Intake' });
    await intakeBtn.click();
    await expect(page.locator('text=Rapid Walk-In Patient Intake')).toBeVisible();

    // 2. Fill intake details
    await page.fill('input[placeholder="98260 12345"]', '9826088888');
    await page.fill('input[placeholder="e.g. Ramesh Kumar"]', 'Anjali Verma');

    // 3. Select UPI QR Payment Mode
    const upiButton = page.locator('button', { hasText: '📱 UPI QR' });
    await expect(upiButton).toBeVisible();
    await upiButton.click();

    // 4. Submit Intake Form
    const submitBtn = page.locator('button', { hasText: /Allocate Token & Generate Receipt/i });
    await submitBtn.click();

    // 5. Assert Dynamic BharatQR Modal is displayed
    await expect(page.locator('text=Dynamic BharatQR UPI Collection')).toBeVisible();
    await expect(page.locator('text=bhopalcare@icici')).toBeVisible();
    await expect(page.locator('text=Zero MDR Charge')).toBeVisible();
    await expect(page.locator('text=PhonePe')).toBeVisible();
    await expect(page.locator('text=Google Pay')).toBeVisible();

    // 6. Simulate scan & pay button
    const payBtn = page.locator('button', { hasText: /Simulate Scan & Pay/i });
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // 7. Verify instant payment success verification screen
    await expect(page.locator('text=UPI Payment Verified!')).toBeVisible();

    // 8. Assert auto-transition to 80mm ESC/POS Thermal Receipt
    await expect(page.getByRole('dialog').getByText('BHOPAL CITY CARE POLYCLINIC')).toBeVisible();
    await expect(page.locator('text=TOKEN NUMBER')).toBeVisible();
    await expect(page.locator('text=PAID_UPI_QR')).toBeVisible();

    // 9. Close receipt and verify updated UPI Collections KPI
    const doneBtn = page.locator('button', { hasText: 'Done' });
    await doneBtn.click();

    // UPI collections should reflect the added ₹600 (from ₹18,600 to ₹19,200)
    await expect(page.locator('text=₹19,200')).toBeVisible();
  });

  test('8.2 Backend REST API: /api/v1/cashiering/upi-intent and /upi-verify endpoints', async ({ request }) => {
    // 1. Generate dynamic UPI Intent
    const intentRes = await request.post(`${apiBase}/api/v1/cashiering/upi-intent`, {
      data: {
        tokenNumber: 25,
        amountRupees: 600,
        doctorName: 'Dr. Rajesh Sharma',
        chamberNumber: 'CH-1',
      },
    });

    expect(intentRes.status()).toBe(200);
    const intentData = await intentRes.json();
    expect(intentData.success).toBe(true);
    expect(intentData.vpa).toBe('bhopalcare@icici');
    expect(intentData.amountRupees).toBe(600);
    expect(intentData.upiUri).toContain('upi://pay?pa=bhopalcare@icici');
    expect(intentData.txnId).toMatch(/^TXN-UPI-/);

    // 2. Verify payment status
    const verifyRes = await request.post(`${apiBase}/api/v1/cashiering/upi-verify/${intentData.txnId}`);
    expect(verifyRes.status()).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.status).toBe('PAID');
    expect(verifyData.mdrRatePercent).toBe(0.0);
  });
});

