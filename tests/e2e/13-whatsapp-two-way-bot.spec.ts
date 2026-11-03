import { test, expect } from '@playwright/test';

test.describe('E2E Workflow 13 (Phase 54): Automated Two-Way WhatsApp Cloud Bot for Live Queue Tracking', () => {
  test('13.1 Meta Cloud API Webhook Handshake: Validates challenge with verify_token and rejects invalid attempts', async ({ request }) => {
    // 1. Valid handshake
    const validRes = await request.get('http://127.0.0.1:4000/api/v1/whatsapp/webhook', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'medibooking_wa_secret_2026',
        'hub.challenge': 'META_VERIFY_CHALLENGE_TEST_789',
      },
    });
    expect(validRes.status()).toBe(200);
    const bodyText = await validRes.text();
    expect(bodyText).toBe('META_VERIFY_CHALLENGE_TEST_789');

    // 2. Invalid handshake attempt
    const invalidRes = await request.get('http://127.0.0.1:4000/api/v1/whatsapp/webhook', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': 'INVALID_CHALLENGE',
      },
    });
    expect(invalidRes.status()).toBe(403);
  });

  test('13.2 Meta Inbound Webhook Payload: Processes STATUS, DELAY, and CANCEL commands with bilingual template replies', async ({ request }) => {
    // 1. Test Inbound "STATUS" command via Meta webhook format
    const metaPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '10987654321',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '917554019283',
                  phone_number_id: '10987654321',
                },
                contacts: [{ profile: { name: 'Ramesh Kumar' }, wa_id: '919826011111' }],
                messages: [
                  {
                    from: '919826011111',
                    id: 'wamid.HBgLMTIzNDU2Nzg5MA==',
                    timestamp: '1730680000',
                    text: { body: 'STATUS' },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const webhookRes = await request.post('http://127.0.0.1:4000/api/v1/whatsapp/webhook', {
      data: metaPayload,
    });
    expect(webhookRes.status()).toBe(200);
    const webhookJson = await webhookRes.json();
    expect(webhookJson.success).toBe(true);
    expect(webhookJson.processedCount).toBe(1);
    expect(webhookJson.replies[0].commandRecognized).toBe('STATUS');
    expect(webhookJson.replies[0].replyText).toContain('टोकन स्थिति');
    expect(webhookJson.replies[0].replyText).toContain('#15');
    expect(webhookJson.replies[0].replyText).toContain('CH-1');
    expect(webhookJson.replies[0].replyText).toContain('Rajesh Sharma');

    // 2. Test Inbound "DELAY" simulation endpoint
    const delayRes = await request.post('http://127.0.0.1:4000/api/v1/whatsapp/simulate-inbound', {
      data: {
        senderMobile: '9826011111',
        messageText: 'DELAY',
      },
    });
    expect(delayRes.status()).toBe(200);
    const delayJson = await delayRes.json();
    expect(delayJson.botReply.commandRecognized).toBe('DELAY');
    expect(delayJson.botReply.replyText).toContain('डॉक्टर विलंब स्थिति');
  });

  test('13.3 Patient Tracker Portal: Interactive WhatsApp Bot Simulator renders live chat and answers patient queries', async ({ page }) => {
    // Authenticate as Patient
    await page.context().clearCookies();
    await page.goto('http://localhost:3000/login');
    await page.locator('button', { hasText: 'Patient Tracker' }).click();
    await page.locator('button', { hasText: /Instant Dev Login/i }).click();
    await expect(page).toHaveURL(/.*\/patient/, { timeout: 10000 });

    // Verify WhatsApp Bot Assistant Card is visible
    const botHeader = page.locator('text=MediBooking Bhopal Care Bot');
    await expect(botHeader).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=+91 755 4019283')).toBeVisible();

    // Click interactive quick chip "STATUS"
    const statusChip = page.locator('button', { hasText: '📊 STATUS' });
    await expect(statusChip).toBeVisible();
    await statusChip.click();

    // Verify user message appears in chat
    await expect(page.locator('text=STATUS').first()).toBeVisible();

    // Verify bot replies in chat with token details
    await expect(page.locator('text=/Ramesh Kumar/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/टोकन स्थिति/i').last()).toBeVisible({ timeout: 5000 });

    // Click interactive quick chip "DELAY"
    const delayChip = page.locator('button', { hasText: '⏳ DELAY' });
    await delayChip.click();

    // Verify doctor delay update message in chat
    await expect(page.locator('text=/डॉक्टर विलंब स्थिति/i')).toBeVisible({ timeout: 5000 });
  });
});

