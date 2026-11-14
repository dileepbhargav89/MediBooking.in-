import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 5 Multi-Perspective Audit: Patient Feedback & Reputation Engine (MediBooking Prime Accreditation)', () => {
  const artifactDir = 'C:/Users/DILEEP BHARGAV/.gemini/antigravity/brain/3156ef61-eedf-40f0-bde3-ad9cf6b39876';

  test('38.1 Doctor Profile Verified Reviews & MediBooking Prime Accreditation Badge (/dr/[slug])', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/dr/dr-rajesh-sharma-cardio');

    // 1. Verify Doctor Reviews Section & Prime Accreditation Badge
    const reviewsSection = page.getByTestId('doctor-reviews-section');
    await expect(reviewsSection).toBeVisible();

    const primeBadge = page.getByTestId('badge-prime-accredited');
    await expect(primeBadge).toBeVisible();
    await expect(primeBadge).toContainText('MediBooking Prime Polyclinic');

    await expect(reviewsSection.locator('text=⭐ 4.9 (48 Verified Patient Stories)')).toBeVisible();

    // 2. Verify Metric Cards
    await expect(reviewsSection.locator('text=Wait Time Accuracy')).toBeVisible();
    await expect(reviewsSection.locator('text=94%')).toBeVisible();
    await expect(reviewsSection.locator('text=Family Recommendation')).toBeVisible();
    await expect(reviewsSection.locator('text=98%')).toBeVisible();
    await expect(reviewsSection.locator('text=4.9 / 5.0')).toBeVisible();

    // 3. Verify Pre-Seeded Verified Review (Ramesh Kumar for Kailash Prasad)
    const reviewCard = page.getByTestId('review-card-rev-sharma-01');
    await expect(reviewCard).toBeVisible();
    await expect(reviewCard.locator('text=Ramesh Kumar (for Kailash Prasad)')).toBeVisible();
    await expect(reviewCard.locator('text=✓ Verified Consultation Token #10')).toBeVisible();

    // 4. Verify Doctor Reply Box
    const replyBox = reviewCard.getByTestId('doctor-reply-box');
    await expect(replyBox).toBeVisible();
    await expect(replyBox.locator('text=Dr. Rajesh Sharma (Verified Doctor Reply):')).toBeVisible();
    await expect(replyBox.locator('text=Thank you Ramesh ji')).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-49-doctor-prime-reviews.png'),
      fullPage: true,
    });
  });

  test('38.2 Transaction-Verified Patient Feedback & Rating Submission (/patient/review)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/patient/review');

    // 1. Verify Page Header & Verified Check
    await expect(page.locator('text=Rate Your Consultation with Dr. Rajesh Sharma')).toBeVisible();
    await expect(page.locator('text=Verified Consultation Feedback')).toBeVisible();

    // 2. Select 5 Stars
    const starBtn5 = page.getByTestId('star-btn-5');
    await expect(starBtn5).toBeVisible();
    await starBtn5.click();
    await expect(page.getByTestId('rating-label')).toContainText('⭐⭐⭐⭐⭐ Excellent');

    // 3. Select Wait Time: < 15 Mins
    const waitAccurateBtn = page.getByTestId('wait-btn-accurate');
    await expect(waitAccurateBtn).toBeVisible();
    await waitAccurateBtn.click();

    // 4. Verify Comment Input
    const commentInput = page.getByTestId('input-review-comment');
    await expect(commentInput).toBeVisible();
    await commentInput.fill('डॉक्टर साहब ने बहुत अच्छे से समझाया। दवाइयों की पर्ची तुरंत फोन पर मिल गई और काउंटर पर बिल्कुल भी इंतज़ार नहीं करना पड़ा।');

    // 5. Submit Review
    const btnSubmit = page.getByTestId('btn-submit-review');
    await expect(btnSubmit).toBeVisible();
    await btnSubmit.click();

    // 6. Verify Submission Confirmation Banner
    const successBanner = page.getByTestId('banner-review-published');
    await expect(successBanner).toBeVisible();
    await expect(successBanner).toContainText('Thank You, Ramesh ji! Your Review is Published.');
    await expect(successBanner).toContainText('MediBooking Prime Polyclinic Accreditation');

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-50-patient-feedback-submission.png'),
    });
  });

  test('38.3 Doctor Bedside Manner Public Reply Workflow', async ({ page }) => {
    test.setTimeout(60000);

    // Call REST endpoint to submit doctor reply to rev-sharma-02
    const replyPayload = {
      replyText: 'Thank you Sunita ji for your valuable review. Glad our receptionist took vitals promptly. Stay healthy!',
    };

    const res = await page.request.post('http://127.0.0.1:4000/api/v1/reviews/rev-sharma-02/reply', {
      data: replyPayload,
    });
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.review.doctorReplyText).toContain('Thank you Sunita ji');

    // Now visit doctor profile to verify reply renders
    await page.goto('/dr/dr-rajesh-sharma-cardio');
    const reviewsFeed = page.getByTestId('patient-reviews-feed');
    await expect(reviewsFeed).toBeVisible();
    await expect(reviewsFeed.locator('text=Sunita Verma')).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-51-doctor-reply-workflow.png'),
      fullPage: true,
    });
  });

  test('38.4 Super Admin Review Moderation & Defamation Shield (/super-admin/reviews)', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Authenticate as Super Admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('button', { hasText: 'Super Admin' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL('/super-admin', { timeout: 15000 });

    // 2. Navigate to Review Moderation Console
    await page.goto('/super-admin/reviews');
    await page.waitForLoadState('networkidle');

    // 3. Verify Header & Moderation Queue
    await expect(page.locator('text=Patient Review Moderation & Defamation Shield')).toBeVisible();
    await expect(page.locator('text=National Medical Commission (NMC) Advertising Ethics')).toBeVisible();

    // Check pending review card (Pradeep Saxena - rev-sharma-04)
    const cardMod = page.getByTestId('moderation-card-rev-sharma-04');
    await expect(cardMod).toBeVisible();
    await expect(cardMod.locator('text=Pradeep Saxena')).toBeVisible();
    await expect(cardMod.locator('text=Pending Moderation')).toBeVisible();

    // 4. Click Approve & Publish
    const btnApprove = page.getByTestId('btn-approve-review-rev-sharma-04');
    await expect(btnApprove).toBeVisible();
    await btnApprove.click();

    // 5. Verify Success Notice
    const successNotice = page.getByTestId('banner-moderation-success');
    await expect(successNotice).toBeVisible();
    await expect(successNotice).toContainText('Review approved and published to public doctor profile.');

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'qa-52-superadmin-review-moderation.png'),
      fullPage: true,
    });
  });
});

