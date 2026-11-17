import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 9: Self-Service SaaS Plan Upgrades & Two-Witness Cashier Handover', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  // 43.1 CLINIC ADMIN SAAS PLAN CARD & 1-CLICK INSTANT RENEWAL
  test('43.1 Clinic Admin SaaS Plan Overview, Expiration Countdown & 1-Click Renewal', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Authenticate as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 15000 });

    // 2. Verify SaaS Plan Status Card on Clinic Overview
    const planCard = page.getByTestId('card-saas-plan-status');
    await expect(planCard).toBeVisible();
    await expect(planCard.locator('text=Clinic Pro Plan')).toBeVisible();
    await expect(planCard.locator('text=B2B Polyclinic SaaS Subscription')).toBeVisible();

    const expiryText = page.getByTestId('text-saas-expiry');
    await expect(expiryText).toBeVisible();
    await expect(expiryText).toContainText('14 Days Remaining');

    const chambersText = page.getByTestId('text-saas-chambers');
    await expect(chambersText).toBeVisible();
    await expect(chambersText).toContainText('4 / 4 Chambers Active');

    // Capture Visual Artifact: Admin SaaS Plan Card
    await page.screenshot({
      path: path.join(artifactDir, 'qa-64-admin-saas-plan-card.png'),
      fullPage: true,
    });

    // 3. Trigger 1-Click Instant Renewal (Razorpay Flow A Simulation)
    const renewBtn = page.getByTestId('btn-renew-saas-plan');
    await expect(renewBtn).toBeVisible();
    await renewBtn.click();

    // 4. Verify Immediate Toast Alert & Extended Expiry
    const renewToast = page.getByTestId('toast-saas-renewed');
    await expect(renewToast).toBeVisible();
    await expect(renewToast).toContainText('+30 Days Extended');
    await expect(renewToast).toContainText('Razorpay B2B Order #RZP-SUB-82910');

    await expect(expiryText).toContainText('44 Days Remaining');

    // Capture Visual Artifact: Admin SaaS Instant Renewal Execution
    await page.screenshot({
      path: path.join(artifactDir, 'qa-65-admin-saas-instant-renewal.png'),
      fullPage: true,
    });
  });

  // 43.2 PLAN UPGRADE TO POLYCLINIC ENTERPRISE (8 CHAMBERS) & BILLING TAB
  test('43.2 Plan Upgrade to Polyclinic Enterprise (8 Chambers) & Billing Tab Switcher', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Authenticate as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 15000 });

    const planCard = page.getByTestId('card-saas-plan-status');
    await expect(planCard).toBeVisible();

    // 2. Click Upgrade to Polyclinic Enterprise
    const upgradeBtn = page.getByTestId('btn-upgrade-enterprise');
    await expect(upgradeBtn).toBeVisible();
    await upgradeBtn.click();

    // 3. Verify Upgraded State on Clinic Overview
    const upgradeToast = page.getByTestId('toast-saas-upgraded');
    await expect(upgradeToast).toBeVisible();
    await expect(upgradeToast).toContainText('Upgraded to Polyclinic Enterprise: 8 Chambers unlocked');

    const chambersText = page.getByTestId('text-saas-chambers');
    await expect(chambersText).toContainText('4 / 8 Chambers Active');

    // 4. Switch to Billing Tab & Test Cycle Switcher
    const billingTab = page.locator('button', { hasText: /SaaS Subscription Billing/i });
    await expect(billingTab).toBeVisible();
    await billingTab.click();

    await expect(page.locator('h3', { hasText: /B2B SaaS Subscription/i })).toBeVisible();
    await expect(page.getByTestId('btn-select-enterprise')).toBeDisabled(); // Already active

    // 5. Toggle Annual Billing
    const annualBtn = page.getByTestId('btn-cycle-annual');
    await expect(annualBtn).toBeVisible();
    await annualBtn.click();
    await expect(annualBtn).toContainText('Save 20%');

    // 6. Test GST Tax Invoice Download
    const downloadInvoiceBtn = page.getByTestId('btn-download-gst-invoice');
    await expect(downloadInvoiceBtn).toBeVisible();
    await downloadInvoiceBtn.click();

    const invoiceToast = page.getByTestId('toast-saas-notice');
    await expect(invoiceToast).toBeVisible();
    await expect(invoiceToast).toContainText('GST Tax Invoice #MB-INV-2026-11-042 downloaded successfully');
  });

  // 43.3 RECEPTIONIST TWO-WITNESS DIGITAL CASHIER HANDOVER SIGN-OFF
  test('43.3 Receptionist Two-Witness Digital Cashier Handover Sign-Off', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Authenticate as Receptionist
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Receptionist' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 15000 });

    // 2. Open Shift & Drawer Ledger (De-cluttered from front UI)
    const shiftDrawerBtn = page.getByTestId('btn-open-shift-drawer');
    await expect(shiftDrawerBtn).toBeVisible();
    await shiftDrawerBtn.click();

    await expect(page.locator('text=Front-Desk Physical Cash Denomination Tally')).toBeVisible();

    const handoverBtn = page.getByTestId('btn-open-cashier-handover');
    await expect(handoverBtn).toBeVisible();
    await handoverBtn.click();

    // 3. Verify Two-Witness Modal
    const handoverModal = page.getByTestId('modal-cashier-handover');
    await expect(handoverModal).toBeVisible();
    await expect(handoverModal.locator('text=Morning Shift (08:30 - 14:30)')).toBeVisible();
    await expect(handoverModal.locator('text=₹12,400').first()).toBeVisible();
    await expect(handoverModal.locator('text=ZERO VARIANCE')).toBeVisible();

    // 4. Fill 4-Digit Dual Sign-Off PINs
    const outgoingPin = page.getByTestId('input-outgoing-pin');
    await expect(outgoingPin).toBeVisible();
    await outgoingPin.fill('1234');

    const witnessPin = page.getByTestId('input-witness-pin');
    await expect(witnessPin).toBeVisible();
    await witnessPin.fill('5678');

    // 5. Submit Dual Sign-Off
    const confirmBtn = page.getByTestId('btn-confirm-handover');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 6. Verify Modal Closes and Verified Anti-Pilferage Badge Appears
    await expect(handoverModal).not.toBeVisible();

    const verifiedBadge = page.getByTestId('badge-handover-verified');
    await expect(verifiedBadge).toBeVisible();
    await expect(verifiedBadge).toContainText('2-Witness Handover Verified');
    await expect(verifiedBadge).toContainText('HANDOVER-20261114-SUNITA-VIKRAM-SHA256');

    // Capture Visual Artifact: Receptionist Two-Witness Handover Verified
    await page.screenshot({
      path: path.join(artifactDir, 'qa-66-reception-two-witness-cashier-handover.png'),
      fullPage: true,
    });
  });
});
