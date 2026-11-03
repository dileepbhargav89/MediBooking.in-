import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 14 (Phase 55): Polyclinic Revenue Split & Doctor Settlement Dashboard', () => {
  test('14.1 Clinic Administrator verifies 80/20 doctor split, Section 194J TDS, and Net NEFT ledger', async ({ page }) => {
    // Authenticate as Clinic Administrator
    await page.context().clearCookies();
    await page.goto('http://localhost:3000/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/.*\/admin/, { timeout: 10000 });

    // Click Settlement & NEFT Ledger Tab
    const settlementsTab = page.locator('button', { hasText: /Doctor Revenue Split & NEFT Ledger/i });
    await expect(settlementsTab).toBeVisible({ timeout: 10000 });
    await settlementsTab.click();

    // Verify Financial Stat Cards
    await expect(page.locator('text=Gross OPD Revenue')).toBeVisible();
    await expect(page.locator('text=₹37,500')).toBeVisible();

    await expect(page.locator('text=Doctor Share (80%)')).toBeVisible();
    await expect(page.locator('text=₹30,000')).toBeVisible();

    await expect(page.locator('text=Clinic Commission (20%)')).toBeVisible();
    await expect(page.locator('text=₹7,500')).toBeVisible();

    await expect(page.locator('text=Net NEFT Payable')).toBeVisible();
    await expect(page.locator('text=₹27,000')).toBeVisible();

    // Verify Doctors in Ledger
    await expect(page.locator('text=Dr. Rajesh Sharma').first()).toBeVisible();
    await expect(page.locator('text=₹9,504')).toBeVisible();

    await expect(page.locator('text=Dr. Priya Patel').first()).toBeVisible();
    await expect(page.locator('text=₹6,480').first()).toBeVisible();

    await expect(page.locator('text=Dr. Sunita Rao').first()).toBeVisible();
    await expect(page.locator('text=₹4,536')).toBeVisible();
  });

  test('14.2 Exporting NEFT CMS Batch generates downloadable CSV and feedback notice', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('http://localhost:3000/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/.*\/admin/, { timeout: 10000 });

    const settlementsTab = page.locator('button', { hasText: /Doctor Revenue Split & NEFT Ledger/i });
    await settlementsTab.click();

    // Click Export NEFT CMS Batch
    const exportBtn = page.locator('button', { hasText: /Export NEFT CMS Batch/i });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify confirmation notice banner
    await expect(page.locator('text=/NEFT CMS Payout Batch/i')).toBeVisible({ timeout: 8000 });
  });

  test('14.3 Backend REST APIs: Validates Daily Split calculations, NEFT CSV generation, and Settlement reconciliation', async ({ request }) => {
    // 1. GET /api/v1/billing/settlements/daily-split
    const splitRes = await request.get('http://127.0.0.1:4000/api/v1/billing/settlements/daily-split');
    expect(splitRes.status()).toBe(200);
    const splitJson = await splitRes.json();
    expect(splitJson.success).toBe(true);
    expect(splitJson.summary.totalPatientsConsulted).toBe(64);
    expect(splitJson.summary.totalGrossRevenueRupees).toBe(37500);
    expect(splitJson.summary.totalDoctorShareRupees).toBe(30000);
    expect(splitJson.summary.totalFacilityCommissionRupees).toBe(7500);
    expect(splitJson.summary.totalTdsDeductedRupees).toBe(3000);
    expect(splitJson.summary.totalNetPayoutPayableRupees).toBe(27000);

    // 2. POST /api/v1/billing/settlements/generate-neft-batch
    const batchRes = await request.post('http://127.0.0.1:4000/api/v1/billing/settlements/generate-neft-batch', {
      data: { clinicId: 'c1010000-0000-4000-8000-000000000001' },
    });
    expect(batchRes.status()).toBe(200);
    const batchJson = await batchRes.json();
    expect(batchJson.success).toBe(true);
    expect(batchJson.recordsCount).toBe(4);
    expect(batchJson.totalAmountRupees).toBe(27000);
    expect(batchJson.csvContent).toContain('Record_Type,Payment_Method,Beneficiary_Name');
    expect(batchJson.csvContent).toContain('PAY,NEFT,"Dr. Rajesh Sharma"');
    expect(batchJson.csvContent).toContain('HDFC0000284,9504.00');

    // 3. POST /api/v1/billing/settlements/mark-settled
    const settleRes = await request.post('http://127.0.0.1:4000/api/v1/billing/settlements/mark-settled', {
      data: {
        clinicId: 'c1010000-0000-4000-8000-000000000001',
        doctorId: 'd1010000-0000-4000-8000-000000000001',
        utrNumber: 'UTR-HDFC-998877665544',
      },
    });
    expect(settleRes.status()).toBe(200);
    const settleJson = await settleRes.json();
    expect(settleJson.success).toBe(true);
    expect(settleJson.settlement.payoutStatus).toBe('SETTLED');
    expect(settleJson.settlement.payoutReference).toBe('UTR-HDFC-998877665544');
  });
});

