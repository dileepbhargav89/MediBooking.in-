import { test, expect } from '@playwright/test';
import { EscposPrinterDriver } from '../../packages/ui/src/printers/escpos-printer-driver';

test.describe('E2E Workflow 9 (Phase 50): Native Web Bluetooth / Serial ESC/POS 80mm Print Driver', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });
    await expect(page.locator('header')).toContainText('Central Reception Desk');
  });

  test('9.1 Reception receipt modal triggers direct binary ESC/POS hardware print without browser print dialog', async ({ page }) => {
    // 1. Perform Rapid Walk-in Intake
    const intakeBtn = page.locator('button', { hasText: '+ Walk-In Intake' });
    await intakeBtn.click();
    await expect(page.locator('text=Rapid Walk-In Patient Intake')).toBeVisible();

    await page.fill('input[placeholder="98260 12345"]', '9826099991');
    await page.fill('input[placeholder="e.g. Ramesh Kumar"]', 'Devendra Yadav');

    const submitBtn = page.locator('button', { hasText: /Allocate Token & Generate Receipt/i });
    await submitBtn.click();

    // 2. Receipt Modal opens
    await expect(page.getByRole('dialog').getByText('BHOPAL CITY CARE POLYCLINIC')).toBeVisible();
    await expect(page.locator('text=TOKEN NUMBER')).toBeVisible();

    // 3. Click Direct Hardware Print (ESC/POS)
    const directPrintBtn = page.locator('button', { hasText: /Direct Hardware Print \(ESC\/POS\)/i });
    await expect(directPrintBtn).toBeVisible();
    await directPrintBtn.click();

    // 4. Verify confirmation banner with byte count
    await expect(page.locator('text=/dispatched to 80mm thermal hardware/i')).toBeVisible();
  });

  test('9.2 EscposPrinterDriver binary builder correctly generates Epson ESC/POS control byte sequence', async () => {
    const rawBytes = EscposPrinterDriver.buildBinaryReceipt({
      clinicName: 'Bhopal City Care Polyclinic',
      clinicAddress: 'MP Nagar Zone II, Bhopal',
      clinicPhone: '0755-4019283',
      tokenNumber: 42,
      chamberNumber: 'CH-1',
      patientName: 'R*** Sharma',
      patientMobile: '98260*****',
      doctorName: 'Rajesh Sharma',
      specialty: 'Cardiology',
      paymentStatus: 'PAID_CASH',
      feePaidRupees: 600,
    });

    expect(rawBytes).toBeInstanceOf(Uint8Array);
    expect(rawBytes.length).toBeGreaterThan(150);

    // Verify ESC @ (Printer Init: 0x1B, 0x40)
    expect(rawBytes[0]).toBe(0x1b);
    expect(rawBytes[1]).toBe(0x40);

    // Verify Cut Command at the end (GS V 0x42 0x00)
    const len = rawBytes.length;
    expect(rawBytes[len - 4]).toBe(0x1d);
    expect(rawBytes[len - 3]).toBe(0x56);
    expect(rawBytes[len - 2]).toBe(0x42);
    expect(rawBytes[len - 1]).toBe(0x00);

    // Verify Direct Print Execution
    const result = await EscposPrinterDriver.printDirect({
      clinicName: 'Bhopal City Care Polyclinic',
      clinicAddress: 'MP Nagar Zone II, Bhopal',
      clinicPhone: '0755-4019283',
      tokenNumber: 42,
      chamberNumber: 'CH-1',
      patientName: 'R*** Sharma',
      patientMobile: '98260*****',
      doctorName: 'Rajesh Sharma',
      paymentStatus: 'PAID_CASH',
      feePaidRupees: 600,
    });

    expect(result.success).toBe(true);
    expect(result.bytesDispatched).toBeGreaterThan(100);
    expect(result.durationMs).toBeGreaterThan(0);
  });
});

