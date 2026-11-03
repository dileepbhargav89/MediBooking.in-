import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import { billingService, PLANS } from '../src/services/billing-service';
import { ENV } from '../src/config/env';
import { createApiServer } from '../src/server';

describe('Phase 31: B2B SaaS Subscription Billing Integration (Razorpay Flow A)', () => {
  const clinicId = 'c1010000-0000-4000-8000-000000000001';

  beforeEach(() => {
    billingService.clearBillingData();
  });

  it('1. Default initialization assigns 30-Day Free Pilot Trial with appropriate quotas', () => {
    const sub = billingService.getOrCreateSubscription(clinicId);
    assert.equal(sub.clinicId, clinicId);
    assert.equal(sub.tier, 'TRIAL_30');
    assert.equal(sub.status, 'TRIALING');
    assert.equal(sub.monthlyPriceInr, 0);
    assert.equal(sub.maxChambers, 1);
    assert.equal(sub.maxDoctors, 1);
    assert.equal(sub.tvStreamAllowed, false);
    assert.ok(new Date(sub.currentPeriodEnd).getTime() > Date.now());
  });

  it('2. Razorpay Order Generation computes amounts in paise and sets clinic metadata', async () => {
    // 1. Monthly Clinic Pro (₹1,999 -> 199900 paise)
    const monthlyOrder = await billingService.createRazorpayOrder(clinicId, 'CLINIC_PRO', 'MONTHLY');
    assert.ok(monthlyOrder.orderId.startsWith('order_'));
    assert.equal(monthlyOrder.amountPaise, 199900);
    assert.equal(monthlyOrder.currency, 'INR');
    assert.equal(monthlyOrder.keyId, ENV.RAZORPAY_KEY_ID);
    assert.equal(monthlyOrder.notes.planTier, 'CLINIC_PRO');

    // 2. Annual Solo Essential (₹9,990 -> 999000 paise)
    const annualOrder = await billingService.createRazorpayOrder(clinicId, 'SOLO_ESSENTIAL', 'ANNUAL');
    assert.equal(annualOrder.amountPaise, 999000);
    assert.equal(annualOrder.notes.billingCycle, 'ANNUAL');
  });

  it('3. Cryptographic HMAC-SHA256 signature verification validates authentic payments and rejects forged ones', () => {
    const orderId = 'order_test_12345';
    const paymentId = 'pay_test_67890';
    const validSignature = createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Authentic signature passes
    assert.equal(billingService.verifyRazorpaySignature(orderId, paymentId, validSignature), true);

    // Forged signature fails
    assert.equal(billingService.verifyRazorpaySignature(orderId, paymentId, 'forged_fake_signature_hash'), false);

    // Mismatched orderId fails
    assert.equal(billingService.verifyRazorpaySignature('order_different', paymentId, validSignature), false);
  });

  it('4. Payment Verification activates subscription and generates statutory GST invoice', async () => {
    const order = await billingService.createRazorpayOrder(clinicId, 'POLYCLINIC_ENTERPRISE', 'MONTHLY');
    const paymentId = 'pay_real_99999';
    const signature = createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
      .update(`${order.orderId}|${paymentId}`)
      .digest('hex');

    const result = await billingService.verifyPaymentAndRenew({
      clinicId,
      orderId: order.orderId,
      paymentId,
      signature,
      tier: 'POLYCLINIC_ENTERPRISE',
    });

    assert.equal(result.success, true);
    assert.equal(result.subscription.status, 'ACTIVE');
    assert.equal(result.subscription.tier, 'POLYCLINIC_ENTERPRISE');
    assert.equal(result.subscription.maxChambers, 8);
    assert.equal(result.subscription.tvStreamAllowed, true);

    // GST Invoice verification (₹3,999 + 9% CGST + 9% SGST)
    assert.equal(result.invoice.baseAmountRupees, 3999);
    assert.equal(result.invoice.cgstRupees, 359.91);
    assert.equal(result.invoice.sgstRupees, 359.91);
    assert.equal(result.invoice.totalAmountRupees, 4718.82);
    assert.ok(result.invoice.invoiceNumber.startsWith('INV-'));
    assert.equal(result.invoice.gstin, '23AAAAA0000A1Z5');
  });

  it('5. Entitlement gating enforces chamber limits, TV streaming permissions, and suspension locks', () => {
    // 1. Initial trial: 1 chamber max
    const check1 = billingService.checkEntitlement(clinicId, 'CHAMBER_ADD', 1);
    assert.equal(check1.allowed, false);
    assert.ok(check1.reason?.includes('Chamber quota reached'));

    // 2. TV stream denied on Trial
    const checkTv = billingService.checkEntitlement(clinicId, 'TV_STREAM');
    assert.equal(checkTv.allowed, false);

    // 3. Grace period allows intake but blocks infrastructure expansion
    billingService.simulateGracePeriod(clinicId);
    const graceIntake = billingService.checkEntitlement(clinicId, 'INTAKE_MUTATION');
    assert.equal(graceIntake.allowed, true);
    const graceExpansion = billingService.checkEntitlement(clinicId, 'CHAMBER_ADD', 0);
    assert.equal(graceExpansion.allowed, false);
    assert.ok(graceExpansion.reason?.includes('Infrastructure expansion is locked'));

    // 4. Suspension blocks all intake mutations
    billingService.simulateSuspension(clinicId);
    const suspendedIntake = billingService.checkEntitlement(clinicId, 'INTAKE_MUTATION');
    assert.equal(suspendedIntake.allowed, false);
    assert.ok(suspendedIntake.reason?.includes('Subscription is suspended'));
  });

  it('6. Webhook processing ingests payment.captured and activates subscription', async () => {
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_hook_111',
            amount: 199900,
            notes: {
              clinicId,
              planTier: 'CLINIC_PRO',
            },
          },
        },
      },
    };

    const webhookRes = await billingService.handleWebhook(webhookPayload);
    assert.equal(webhookRes.handled, true);
    assert.ok(webhookRes.action.includes('Activated CLINIC_PRO'));

    const sub = billingService.getOrCreateSubscription(clinicId);
    assert.equal(sub.status, 'ACTIVE');
  });

  it('7. REST API: GET /subscriptions/:clinicId, POST /razorpay/create-order and verify-payment', async () => {
    const server = await createApiServer();

    // 1. Get subscription
    const getRes = await server.inject({
      method: 'GET',
      url: `/api/v1/billing/subscriptions/${clinicId}`,
    });
    assert.equal(getRes.statusCode, 200);
    const getJson = JSON.parse(getRes.body);
    assert.equal(getJson.success, true);
    assert.equal(getJson.subscription.tier, 'TRIAL_30');
    assert.ok(getJson.availablePlans.length >= 4);

    // 2. Create Razorpay order
    const orderRes = await server.inject({
      method: 'POST',
      url: '/api/v1/billing/razorpay/create-order',
      payload: {
        clinicId,
        tier: 'SOLO_ESSENTIAL',
        billingCycle: 'MONTHLY',
      },
    });
    assert.equal(orderRes.statusCode, 200);
    const orderJson = JSON.parse(orderRes.body);
    assert.equal(orderJson.order.amountPaise, 99900);

    // 3. Verify Payment
    const paymentId = 'pay_api_123';
    const validSig = createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
      .update(`${orderJson.order.orderId}|${paymentId}`)
      .digest('hex');

    const verifyRes = await server.inject({
      method: 'POST',
      url: '/api/v1/billing/razorpay/verify-payment',
      payload: {
        clinicId,
        orderId: orderJson.order.orderId,
        paymentId,
        signature: validSig,
        tier: 'SOLO_ESSENTIAL',
      },
    });
    assert.equal(verifyRes.statusCode, 200);
    const verifyJson = JSON.parse(verifyRes.body);
    assert.equal(verifyJson.subscription.status, 'ACTIVE');
    assert.equal(verifyJson.invoice.baseAmountRupees, 999);

    // 4. Reject tampered payment
    const badVerify = await server.inject({
      method: 'POST',
      url: '/api/v1/billing/razorpay/verify-payment',
      payload: {
        clinicId,
        orderId: orderJson.order.orderId,
        paymentId,
        signature: 'invalid_tampered_signature',
        tier: 'SOLO_ESSENTIAL',
      },
    });
    assert.equal(badVerify.statusCode, 400);

    await server.close();
  });
});

