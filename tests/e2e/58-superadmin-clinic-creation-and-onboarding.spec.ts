import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACTS_DIR = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

test.describe('E2E Suite 58: Super Admin Clinic Provisioning & Clinic Admin Doctor/Receptionist Onboarding Engine', () => {

  test('58.1 Super Admin creates/provisions new Polyclinic tenant and generates instant admin WhatsApp onboarding link', async ({ page }) => {
    // 1. Authenticate as Super Admin via quick role login
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 25000 });
    await expect(page.locator('text=Super Administrator Console')).toBeVisible();

    // 2. Navigate to Polyclinic Tenants tab
    const tenantsTab = page.getByTestId('sidebar-btn-tenants');
    await expect(tenantsTab).toBeVisible();
    await tenantsTab.click();

    // 3. Verify initial tenant table and count
    await expect(page.locator('text=Active Polyclinic Tenants in Bhopal & Network')).toBeVisible();
    await expect(page.locator('text=10 Provisioned Tenants')).toBeVisible();

    // 4. Open Provision Clinic Modal
    const provisionBtn = page.getByTestId('btn-provision-clinic');
    await expect(provisionBtn).toBeVisible();
    await provisionBtn.click();

    // 5. Verify modal appears
    const modal = page.getByTestId('modal-provision-clinic');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Provision New Polyclinic Tenant')).toBeVisible();

    // 6. Fill in Clinic Details
    await page.getByTestId('input-clinic-name').fill('Bhopal Prime Care Hospital');
    await page.getByTestId('input-clinic-area').fill('Arera Colony E-3');
    await page.getByTestId('select-clinic-chambers').selectOption('6');
    await page.getByTestId('select-clinic-plan').selectOption('CLINIC_PRO');

    // 7. Fill in Primary Clinic Admin Details
    await page.getByTestId('input-admin-name').fill('Dr. Alok Mathur');
    await page.getByTestId('input-admin-mobile').fill('9826012345');
    await page.getByTestId('input-admin-email').fill('admin@bhopalprimecare.in');

    // 8. Submit Provisioning Request
    await page.getByTestId('btn-save-new-clinic').click();

    // 9. Verify Success Card appears with credentials & onboarding channels
    const successCard = page.getByTestId('provision-clinic-success-card');
    await expect(successCard).toBeVisible();
    await expect(successCard.locator('text=Polyclinic Tenant Successfully Provisioned!')).toBeVisible();
    await expect(successCard.locator('text=Bhopal Prime Care Hospital')).toBeVisible();
    await expect(successCard.locator('text=6 Chambers')).toBeVisible();
    await expect(successCard.locator('text=Dr. Alok Mathur')).toBeVisible();

    // 10. Verify WhatsApp deep link contains admin mobile & welcome text
    const whatsappBtn = page.getByTestId('btn-whatsapp-admin-invite');
    await expect(whatsappBtn).toBeVisible();
    const whatsappHref = await whatsappBtn.getAttribute('href');
    expect(whatsappHref).toContain('wa.me/919826012345');
    expect(whatsappHref).toContain('Bhopal%20Prime%20Care%20Hospital');

    // 11. Test Copy Admin Link action
    const copyBtn = page.getByTestId('btn-copy-admin-link');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(copyBtn).toContainText('Link Copied');

    // Capture visual artifact for Super Admin clinic creation
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-132-superadmin-create-clinic.png'),
      fullPage: true,
    });

    // 12. Close modal
    await page.getByTestId('btn-close-provision-modal').click();
    await expect(modal).not.toBeVisible();

    // 13. Verify tenant table now reflects 11 tenants and includes Bhopal Prime Care Hospital
    await expect(page.locator('text=11 Provisioned Tenants')).toBeVisible();
    const newRow = page.locator('tr', { hasText: 'Bhopal Prime Care Hospital' });
    await expect(newRow).toBeVisible();
    await expect(newRow.locator('text=6 Chambers')).toBeVisible();
    await expect(newRow.locator('text=Dr. Alok Mathur (+91 9826012345)')).toBeVisible();
    await expect(newRow.locator('text=Admin Desk →')).toBeVisible();
  });

  test('58.2 Clinic Admin adds new doctor to clinic and dispatches multi-channel onboarding invite', async ({ page }) => {
    // 1. Authenticate as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 25000 });
    await expect(page.locator('text=Clinic Administrator Portal')).toBeVisible();

    // 2. Navigate to Doctor Affiliations tab
    const affiliationsTab = page.getByTestId('tab-doctor-affiliations');
    await expect(affiliationsTab).toBeVisible();
    await affiliationsTab.click();

    // 3. Verify affiliations directory renders
    await expect(page.locator('text=Clinic-Doctor Affiliation & Onboarding Directory')).toBeVisible();
    await expect(page.locator('text=4 Doctors Affiliated')).toBeVisible();

    // 4. Click Add Doctor to Clinic
    const addDoctorBtn = page.getByTestId('btn-add-doctor-to-clinic');
    await expect(addDoctorBtn).toBeVisible();
    await addDoctorBtn.click();

    // 5. Verify Add Doctor Modal opens
    const addModal = page.getByTestId('modal-add-doctor');
    await expect(addModal).toBeVisible();

    // 6. Fill in Doctor Profile
    await page.getByTestId('input-doctor-name').fill('Dr. Rajiv Singhal');
    await page.getByTestId('select-doctor-specialty').selectOption('Neurologist');
    await page.getByTestId('input-doctor-nmc').fill('MP-71829');
    await page.getByTestId('select-doctor-chamber').selectOption('CH-5');
    await page.getByTestId('input-doctor-fee').fill('800');
    await page.getByTestId('input-doctor-followup-fee').fill('400');
    await page.getByTestId('input-doctor-mobile').fill('9826088888');
    await page.getByTestId('input-doctor-email').fill('dr.singhal@bhopalcitycare.in');

    // 7. Save Doctor
    await page.getByTestId('btn-save-new-doctor').click();

    // 8. Verify Doctor Onboarding Invite Modal opens automatically
    const inviteModal = page.getByTestId('modal-doctor-invite');
    await expect(inviteModal).toBeVisible();
    await expect(inviteModal.locator('text=Dr. Rajiv Singhal')).toBeVisible();
    await expect(inviteModal.locator('text=Neurologist')).toBeVisible();
    await expect(inviteModal.locator('text=CH-5')).toBeVisible();
    await expect(inviteModal.locator('text=₹800 Fee')).toBeVisible();

    // 9. Verify WhatsApp invite deep link
    const whatsappDoctorBtn = page.getByTestId('btn-whatsapp-doctor-invite');
    await expect(whatsappDoctorBtn).toBeVisible();
    const whatsappHref = await whatsappDoctorBtn.getAttribute('href');
    expect(whatsappHref).toContain('wa.me/919826088888');
    expect(whatsappHref).toContain('Rajiv%20Singhal');
    expect(whatsappHref).toContain('CH-5');

    // 10. Test Copy Onboarding Link
    const copyLinkBtn = page.getByTestId('btn-copy-doctor-invite-link');
    await expect(copyLinkBtn).toBeVisible();
    await copyLinkBtn.click();
    await expect(copyLinkBtn).toContainText('Link Copied');

    // Capture visual artifact for doctor onboarding invite
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-133-clinic-admin-doctor-invite.png'),
      fullPage: true,
    });

    // 11. Test Email Invite
    const emailDoctorBtn = page.getByTestId('btn-email-doctor-invite');
    await expect(emailDoctorBtn).toBeVisible();
    await emailDoctorBtn.click();

    // 12. Verify invite modal closed and table updated with 5 doctors & status badge
    await expect(inviteModal).not.toBeVisible();
    await expect(page.locator('text=5 Doctors Affiliated')).toBeVisible();

    const doctorRow = page.locator('tr', { hasText: 'Dr. Rajiv Singhal' });
    await expect(doctorRow).toBeVisible();
    await expect(doctorRow.locator('text=Neurologist')).toBeVisible();
    await expect(doctorRow.locator('text=CH-5')).toBeVisible();
    await expect(doctorRow.locator('text=₹800')).toBeVisible();
    await expect(doctorRow.locator('text=📨 Invite Sent')).toBeVisible();

    // Verify Send Invite button works from row
    const rowInviteBtn = doctorRow.locator('button', { hasText: /Send Invite/i });
    await expect(rowInviteBtn).toBeVisible();
    await rowInviteBtn.click();
    await expect(page.getByTestId('modal-doctor-invite')).toBeVisible();
    await page.getByTestId('btn-close-doctor-invite').click();
    await expect(page.getByTestId('modal-doctor-invite')).not.toBeVisible();
  });

  test('58.3 Clinic Admin enrolls receptionist staff with shift timing and sends desk access invite', async ({ page }) => {
    // 1. Authenticate as Clinic Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Clinic Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/admin', { timeout: 25000 });

    // 2. Navigate to Reception Staff & Onboarding tab
    const receptionStaffTab = page.getByTestId('tab-reception-staff');
    await expect(receptionStaffTab).toBeVisible();
    await receptionStaffTab.click();

    // 3. Verify Reception Staff management view
    await expect(page.locator('text=Front-Desk Reception Staff & Shift Operations')).toBeVisible();
    await expect(page.locator('text=2 Receptionists Enrolled')).toBeVisible();
    await expect(page.locator('text=Sunita Sahu')).toBeVisible();
    await expect(page.locator('text=Vikram Chouhan')).toBeVisible();

    // 4. Click Add Receptionist
    const addRecBtn = page.getByTestId('btn-add-receptionist');
    await expect(addRecBtn).toBeVisible();
    await addRecBtn.click();

    // 5. Verify Add Receptionist Modal opens
    const addRecModal = page.getByTestId('modal-add-receptionist');
    await expect(addRecModal).toBeVisible();

    // 6. Fill in Receptionist Details
    await page.getByTestId('input-receptionist-name').fill('Pooja Sharma');
    await page.getByTestId('input-receptionist-staff-id').fill('REC-103');
    await page.getByTestId('input-receptionist-mobile').fill('9826099999');
    await page.getByTestId('input-receptionist-pin').fill('6241');
    await page.getByTestId('select-receptionist-shift').selectOption('NIGHT');

    // 7. Save Receptionist
    await page.getByTestId('btn-save-new-receptionist').click();

    // 8. Verify Receptionist Access Invite Modal opens automatically
    const recInviteModal = page.getByTestId('modal-reception-invite');
    await expect(recInviteModal).toBeVisible();
    await expect(recInviteModal.locator('text=Pooja Sharma')).toBeVisible();
    await expect(recInviteModal.locator('text=REC-103')).toBeVisible();
    await expect(recInviteModal.locator('text=NIGHT Shift')).toBeVisible();
    await expect(recInviteModal.locator('text=Cashier Handover PIN: 6241')).toBeVisible();

    // 9. Verify WhatsApp Access Slip button
    const whatsappRecBtn = page.getByTestId('btn-whatsapp-reception-invite');
    await expect(whatsappRecBtn).toBeVisible();
    const whatsappHref = await whatsappRecBtn.getAttribute('href');
    expect(whatsappHref).toContain('wa.me/919826099999');
    expect(whatsappHref).toContain('Pooja%20Sharma');
    expect(whatsappHref).toContain('REC-103');
    expect(whatsappHref).toContain('6241');

    // 10. Test Copy Reception Link
    const copyRecLinkBtn = page.getByTestId('btn-copy-reception-link');
    await expect(copyRecLinkBtn).toBeVisible();
    await copyRecLinkBtn.click();
    await expect(copyRecLinkBtn).toContainText('Desk Link Copied');

    // Capture visual artifact for receptionist access invite
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'qa-134-clinic-admin-receptionist-invite.png'),
      fullPage: true,
    });

    // 11. Test Email Access Credentials
    const emailRecBtn = page.getByTestId('btn-email-reception-invite');
    await expect(emailRecBtn).toBeVisible();
    await emailRecBtn.click();

    // 12. Verify invite modal closed and table shows 3 receptionists
    await expect(recInviteModal).not.toBeVisible();
    await expect(page.locator('text=3 Receptionists Enrolled')).toBeVisible();

    const recRow = page.locator('tr', { hasText: 'Pooja Sharma' });
    await expect(recRow).toBeVisible();
    await expect(recRow.locator('text=REC-103')).toBeVisible();
    await expect(recRow.locator('text=NIGHT')).toBeVisible();
    await expect(recRow.locator('text=•••• 6241')).toBeVisible();
    await expect(recRow.locator('text=📨 Invite Sent')).toBeVisible();

    // Verify row action button
    const rowInviteBtn = recRow.locator('button', { hasText: /Send Invite/i });
    await expect(rowInviteBtn).toBeVisible();
    await rowInviteBtn.click();
    await expect(page.getByTestId('modal-reception-invite')).toBeVisible();
    await page.getByTestId('btn-close-reception-invite').click();
    await expect(page.getByTestId('modal-reception-invite')).not.toBeVisible();
  });

});
