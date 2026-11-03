import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 10 (Phase 51): Bilingual Hindi & English Voice Speech Engine for Waiting Room TV', () => {
  test('10.1 Waiting Room TV renders bilingual voice toggle and dispatches Hindi/English announcements', async ({ page }) => {
    await page.goto('/tv/citycare-mpnagar-bhopal');

    // 1. Verify TV header controls
    await expect(page.locator('h1')).toContainText('Bhopal City Care Polyclinic');
    const voiceBtn = page.locator('button', { hasText: /Voice/i });
    await expect(voiceBtn).toBeVisible();
    await expect(voiceBtn).toContainText('Voice (हिंदी+Eng) ON');

    // 2. Test Voice Toggle interactivity
    await voiceBtn.click();
    await expect(voiceBtn).toContainText('Voice Muted');
    await voiceBtn.click();
    await expect(voiceBtn).toContainText('Voice (हिंदी+Eng) ON');

    // 3. Trigger Chamber 1 Call Next Token simulation
    const callNextBtn = page.locator('button', { hasText: '▶ Call Next Token (Staff Demo)' }).first();
    await expect(callNextBtn).toBeVisible();
    await callNextBtn.click();

    // 4. Assert Announced Callout Flash Banner displays both English and Devanagari Hindi
    const banner = page.locator('text=NOW CALLING:');
    await expect(banner).toBeVisible();
    await expect(page.locator('text=CH-1: #15')).toBeVisible();
    await expect(page.locator('text=/टोकन #15, कक्ष 1/i')).toBeVisible();

    // 5. Inspect speech synthesis window payload
    const speechData = await page.evaluate(() => (window as any).__LAST_ANNOUNCED_VOICE__);
    expect(speechData).toBeTruthy();
    expect(speechData.tokenNumber).toBe(15);
    expect(speechData.chamber).toBe('CH-1');
    expect(speechData.hindi).toContain('टोकन नंबर 15');
    expect(speechData.hindi).toContain('कक्ष क्रमांक 1');
    expect(speechData.english).toContain('Token number 15');
    expect(speechData.english).toContain('Chamber 1');
  });
});
