import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACTS_DIR = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test.describe('E2E Suite 57: Reception Demographics, Patient Visit History, Edit & Revert Lifecycle', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as Receptionist via quick role login
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Reception Desk' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/receptionist', { timeout: 25000 });
    await expect(page.locator('text=Central Reception Desk')).toBeVisible();
  });

  test('57.1 Comprehensive Patient Walk-In Registration with Full Demographics', async ({ page }) => {
    // Click Walk-in Intake button (or press F2)
    const intakeBtn = page.getByTestId('btn-walkin-intake');
    await expect(intakeBtn).toBeVisible();
    await intakeBtn.click();

    // Verify modal appears
    await expect(page.locator('text=Rapid Walk-In Patient Intake')).toBeVisible();

    // Fill demographic inputs
    await page.fill('input[placeholder="98260 12345"]', '9826077889');
    await page.fill('input[placeholder="e.g. Ramesh Kumar"]', 'Smt. Shakuntala Devi');
    
    // Fill age
    const ageInput = page.getByTestId('input-intake-age');
    await ageInput.fill('68');

    // Select Gender: Female
    await page.locator('button:has-text("Female")').click();

    // Select Blood Group: B+
    await page.getByTestId('select-intake-blood-group').selectOption('B+');

    // Click village chip: Berasia
    await page.locator('button:has-text("📍 Berasia")').click();
    await expect(page.getByTestId('input-intake-village')).toHaveValue('Berasia');

    // Click symptom chip: Routine checkup & chest discomfort
    await page.locator('button:has-text("🩺 Routine checkup & chest discomfort")').click();

    // Chamber CH-1 is selected by default

    // Click Submit
    const submitBtn = page.locator('button', { hasText: /Allocate Token & Generate Receipt/i });
    await submitBtn.click();

    // Verify ESC/POS 80mm Thermal Receipt Modal opens with all demographics
    const receiptDialog = page.getByRole('dialog');
    await expect(receiptDialog.getByText('BHOPAL CITY CARE POLYCLINIC')).toBeVisible();
    await expect(receiptDialog.locator('text=Smt. Shakuntala Devi')).toBeVisible();
    await expect(receiptDialog.locator('text=(68Y/F)')).toBeVisible();
    await expect(receiptDialog.locator('text=B+')).toBeVisible();
    await expect(receiptDialog.locator('text=Berasia')).toBeVisible();
    await expect(receiptDialog.locator('text=Dr. Rajesh Sharma')).toBeVisible();

    // Take screenshot of receipt modal
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-127-demographic-receipt-modal.png'),
      fullPage: true,
    });

    // Close Receipt Modal
    await receiptDialog.locator('button:has-text("Done")').click();

    // Verify token card appears in active queue with complete demographic details
    await expect(page.locator('h3:has-text("Smt. Shakuntala Devi")')).toBeVisible();
    await expect(page.locator('text=68 Yrs (F)')).toBeVisible();
    await expect(page.locator('text=Berasia').first()).toBeVisible();

    // Take screenshot of queue with new demographic card
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-127-demographic-token-created.png'),
      fullPage: true,
    });
  });

  test('57.2 Update Patient Demographics via Edit Modal', async ({ page }) => {
    // Find the first token card's Edit button
    const editBtn = page.getByTestId('btn-edit-patient').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Verify Edit Modal opens
    await expect(page.locator('text=Update Patient Demographics')).toBeVisible();

    // Change name, age, and village
    const nameInput = page.getByTestId('input-edit-name');
    await nameInput.fill('Ramesh Kumar Sharma');

    const ageInput = page.getByTestId('input-edit-age');
    await ageInput.fill('52');

    const villageInput = page.getByTestId('input-edit-village');
    await villageInput.fill('Kolar Road');

    // Save
    await page.getByTestId('btn-save-edit-patient').click();

    // Verify toast feedback
    await expect(page.locator('text=Patient details updated successfully')).toBeVisible();

    // Verify updated details on token card
    await expect(page.locator('text=Ramesh Kumar Sharma').first()).toBeVisible();
    await expect(page.locator('text=52 Yrs (M)').first()).toBeVisible();
    await expect(page.locator('text=Kolar Road').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-128-patient-demographics-updated.png'),
      fullPage: true,
    });
  });

  test('57.3 Chamber Card Filtering, Call, Revert, and Move to History', async ({ page }) => {
    // Click CH-2 Chamber Badge to filter queue
    const ch2Badge = page.getByTestId('chamber-card-ch-2');
    await ch2Badge.click();

    // Tab bar should reflect CH-2 active
    await expect(page.locator('button.bg-blue-600', { hasText: 'CH-2' })).toBeVisible();

    // Reset to All Chambers
    await page.locator('button:has-text("All Chambers")').click();

    // Click "Call Token" on Token #15
    const callBtn = page.getByTestId('btn-call-token').first();
    await callBtn.click();

    // Status should now be IN_CONSULTATION and Complete button should appear
    await expect(page.locator('text=In Session').first()).toBeVisible();
    const completeBtn = page.getByTestId('btn-complete-token').first();
    await expect(completeBtn).toBeVisible();

    // Test Revert from In Consultation back to Waiting Area
    const revertBtn = page.getByTestId('btn-revert-token').first();
    await revertBtn.click();

    // Verify feedback toast and status reverted to In Waiting Area
    await expect(page.locator('text=reverted to Waiting Area')).toBeVisible();
    await expect(page.locator('text=In Waiting Area').first()).toBeVisible();

    // Call again and complete
    await page.getByTestId('btn-call-token').first().click();
    await page.getByTestId('btn-complete-token').first().click();

    // Verify consultation completed and moved to History
    await expect(page.locator('text=completed consultation and moved to History')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-129-token-call-and-revert.png'),
      fullPage: true,
    });
  });

  test('57.4 Patient Visit History Tab: Search, Filter, Re-Print, and Revert to Queue', async ({ page }) => {
    // Switch to Patient Visit History tab
    const historyTab = page.getByTestId('tab-patient-history');
    await historyTab.click();

    // Verify history records render
    await expect(page.locator('text=Kailash Nath Sharma')).toBeVisible();
    await expect(page.locator('text=72 Yrs (M)')).toBeVisible();
    await expect(page.locator('text=Pooja Vishwakarma')).toBeVisible();

    // Test search by patient name
    const searchInput = page.getByTestId('input-history-search');
    await searchInput.fill('Kailash');
    await expect(page.locator('text=Kailash Nath Sharma')).toBeVisible();
    await expect(page.locator('text=Pooja Vishwakarma')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');

    // Test doctor chamber filter
    const docSelect = page.getByTestId('select-history-doctor-filter');
    await docSelect.selectOption('CH-2');
    await expect(page.locator('text=Pooja Vishwakarma')).toBeVisible();
    await expect(page.locator('text=Kailash Nath Sharma')).not.toBeVisible();

    // Reset filter
    await docSelect.selectOption('ALL');

    // Test Re-Print Slip opens thermal slip modal
    await page.getByTestId('btn-history-reprint-slip').first().click();
    await expect(page.getByRole('dialog').getByText('BHOPAL CITY CARE POLYCLINIC')).toBeVisible();
    await page.getByRole('dialog').locator('button:has-text("Done")').click();

    // Test Revert to Queue on the first completed patient
    const revertToQueueBtn = page.getByTestId('btn-history-revert-to-queue').first();
    await revertToQueueBtn.click();

    // Verify automatic redirection to Live Queue tab and action toast
    await expect(page.getByTestId('tab-live-queue')).toHaveClass(/bg-blue-600/);
    await expect(page.locator('text=re-opened into Active Queue')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-130-patient-history-and-revert-to-queue.png'),
      fullPage: true,
    });
  });

  test('57.5 Shift Operations Drawer & Receptionist Profile Sign-Out', async ({ page }) => {
    // Verify no bare sign out or quick cash strip in front view
    await expect(page.locator('text=Front-Desk Physical Cash Denomination Tally')).not.toBeVisible();

    // Open Shift Operations Drawer via secondary tools
    const shiftDrawerBtn = page.getByTestId('btn-open-shift-drawer');
    await shiftDrawerBtn.click();

    // Verify Shift Drawer modal contents
    await expect(page.locator('text=Shift Operations & Physical Cash Drawer')).toBeVisible();
    await expect(page.locator('text=Active Shift (08:30 AM - 02:30 PM)')).toBeVisible();
    await expect(page.locator('text=₹12,400').first()).toBeVisible();

    // Open 2-witness handover
    await page.getByTestId('btn-open-cashier-handover').click();
    await expect(page.locator('text=Dual-Witness Digital Cashier Handover Sign-Off')).toBeVisible();

    // Fill PINs
    const handoverModal = page.locator('div[role="dialog"]', { hasText: 'Dual-Witness Digital Cashier Handover' });
    await handoverModal.locator('input[type="password"]').first().fill('1024');
    await handoverModal.locator('input[type="password"]').nth(1).fill('2048');

    // Sign handover
    await page.getByTestId('btn-confirm-handover').click();

    // Verify verified badge
    const verifiedBadge = page.getByTestId('badge-handover-verified');
    await expect(verifiedBadge).toBeVisible();

    // Close Shift Drawer
    await page.locator('button:has-text("Close Drawer")').click();

    // Open Receptionist Profile dropdown
    await page.locator('button:has-text("SV")').click();
    await expect(page.locator('text=Sunita Verma')).toBeVisible();
    await expect(page.getByTestId('btn-receptionist-logout')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-131-shift-operations-and-profile.png'),
      fullPage: true,
    });
  });
});
