import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { ENV } from '../config/env';
import {
  PlanTier,
  PlanDefinition,
  SubscriptionStatus,
  ClinicSubscription,
  RazorpayOrderResult,
  RazorpayPaymentVerifyDTO,
  BillingInvoiceDTO,
} from '@medibooking/types';

export const PLANS: Record<PlanTier, PlanDefinition> = {
  TRIAL_30: {
    tier: 'TRIAL_30',
    name: '30-Day Free Pilot Trial',
    monthlyPriceInr: 0,
    annualPriceInr: 0,
    maxChambers: 1,
    maxDoctors: 1,
    monthlyNotifications: 100,
    tvStreamAllowed: false,
    prioritySupport: false,
  },
  SOLO_ESSENTIAL: {
    tier: 'SOLO_ESSENTIAL',
    name: 'Solo Doctor Essential',
    monthlyPriceInr: 999,
    annualPriceInr: 9990,
    maxChambers: 1,
    maxDoctors: 1,
    monthlyNotifications: 200,
    tvStreamAllowed: false,
    prioritySupport: false,
  },
  CLINIC_PRO: {
    tier: 'CLINIC_PRO',
    name: 'Multi-Doctor Clinic Pro',
    monthlyPriceInr: 1999,
    annualPriceInr: 19990,
    maxChambers: 2,
    maxDoctors: 4,
    monthlyNotifications: 1000,
    tvStreamAllowed: true,
    prioritySupport: false,
  },
  POLYCLINIC_ENTERPRISE: {
    tier: 'POLYCLINIC_ENTERPRISE',
    name: 'Polyclinic Operations Enterprise',
    monthlyPriceInr: 3999,
    annualPriceInr: 39990,
    maxChambers: 8,
    maxDoctors: 999,
    monthlyNotifications: 5000,
    tvStreamAllowed: true,
    prioritySupport: true,
  },
};

export class BillingService {
  // Key: clinicId -> ClinicSubscription
  private subscriptions = new Map<string, ClinicSubscription>();
  // Key: invoiceId -> BillingInvoiceDTO
  private invoices = new Map<string, BillingInvoiceDTO>();
  // Key: orderId -> RazorpayOrderResult
  private activeOrders = new Map<string, RazorpayOrderResult>();

  /**
   * Get existing or initialize default 30-day trial subscription
   */
  public getOrCreateSubscription(clinicId: string, initialTier: PlanTier = 'TRIAL_30'): ClinicSubscription {
    let sub = this.subscriptions.get(clinicId);
    if (!sub) {
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const plan = PLANS[initialTier];

      sub = {
        id: randomUUID(),
        clinicId,
        tier: initialTier,
        status: initialTier === 'TRIAL_30' ? 'TRIALING' : 'ACTIVE',
        monthlyPriceInr: plan.monthlyPriceInr,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: end.toISOString(),
        maxChambers: plan.maxChambers,
        maxDoctors: plan.maxDoctors,
        tvStreamAllowed: plan.tvStreamAllowed,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      this.subscriptions.set(clinicId, sub);
    }
    return sub;
  }

  /**
   * Create Razorpay payment order for subscription upgrade or renewal
   */
  public async createRazorpayOrder(
    clinicId: string,
    tier: PlanTier,
    billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY'
  ): Promise<RazorpayOrderResult> {
    const plan = PLANS[tier];
    if (!plan) {
      throw new Error(`Invalid subscription plan tier: ${tier}`);
    }

    const priceRupees = billingCycle === 'ANNUAL' ? plan.annualPriceInr : plan.monthlyPriceInr;
    const amountPaise = priceRupees * 100;
    const orderId = `order_${randomUUID().replace(/-/g, '').slice(0, 14)}`;

    const orderResult: RazorpayOrderResult = {
      orderId,
      amountPaise,
      currency: 'INR',
      clinicId,
      tier,
      keyId: ENV.RAZORPAY_KEY_ID,
      notes: {
        clinicId,
        planTier: tier,
        billingCycle,
        service: 'MediBooking.in SaaS Subscription',
      },
      createdAt: new Date().toISOString(),
    };

    this.activeOrders.set(orderId, orderResult);
    return orderResult;
  }

  /**
   * Cryptographically verify Razorpay payment HMAC-SHA256 signature
   */
  public verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = ENV.RAZORPAY_KEY_SECRET;
    const body = `${orderId}|${paymentId}`;
    const expected = createHmac('sha256', secret).update(body).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(expected, 'utf-8'), Buffer.from(signature, 'utf-8'));
    } catch {
      return false;
    }
  }

  /**
   * Cryptographically verify Razorpay Webhook signature
   */
  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = ENV.RAZORPAY_WEBHOOK_SECRET;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(expected, 'utf-8'), Buffer.from(signature, 'utf-8'));
    } catch {
      return false;
    }
  }

  /**
   * Verify signature and activate or renew subscription
   */
  public async verifyPaymentAndRenew(dto: RazorpayPaymentVerifyDTO): Promise<{
    success: boolean;
    subscription: ClinicSubscription;
    invoice: BillingInvoiceDTO;
  }> {
    const isValid = this.verifyRazorpaySignature(dto.orderId, dto.paymentId, dto.signature);
    if (!isValid) {
      throw new Error('Invalid Razorpay signature. Payment verification failed.');
    }

    const plan = PLANS[dto.tier];
    if (!plan) {
      throw new Error(`Plan tier not found: ${dto.tier}`);
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sub = this.getOrCreateSubscription(dto.clinicId, dto.tier);
    sub.tier = dto.tier;
    sub.status = 'ACTIVE';
    sub.monthlyPriceInr = plan.monthlyPriceInr;
    sub.currentPeriodStart = now.toISOString();
    sub.currentPeriodEnd = periodEnd.toISOString();
    sub.gracePeriodEnd = undefined;
    sub.maxChambers = plan.maxChambers;
    sub.maxDoctors = plan.maxDoctors;
    sub.tvStreamAllowed = plan.tvStreamAllowed;
    sub.updatedAt = now.toISOString();

    // Generate GST Invoice (18% GST: 9% CGST + 9% SGST for MP domestic tax audit)
    const baseAmount = plan.monthlyPriceInr;
    const cgst = Number((baseAmount * 0.09).toFixed(2));
    const sgst = Number((baseAmount * 0.09).toFixed(2));
    const totalAmount = Number((baseAmount + cgst + sgst).toFixed(2));

    const invoiceId = randomUUID();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      this.invoices.size + 1
    ).padStart(4, '0')}`;

    const invoice: BillingInvoiceDTO = {
      id: invoiceId,
      clinicId: dto.clinicId,
      invoiceNumber,
      tier: dto.tier,
      baseAmountRupees: baseAmount,
      cgstRupees: cgst,
      sgstRupees: sgst,
      totalAmountRupees: totalAmount,
      paymentId: dto.paymentId,
      paidAt: now.toISOString(),
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      gstin: '23AAAAA0000A1Z5',
    };

    this.invoices.set(invoiceId, invoice);
    this.subscriptions.set(dto.clinicId, sub);

    return {
      success: true,
      subscription: sub,
      invoice,
    };
  }

  /**
   * Enforces feature gating and quota limits based on subscription
   */
  public checkEntitlement(
    clinicId: string,
    action: 'CHAMBER_ADD' | 'DOCTOR_ADD' | 'TV_STREAM' | 'INTAKE_MUTATION',
    currentCount = 0
  ): { allowed: boolean; reason?: string } {
    const sub = this.getOrCreateSubscription(clinicId);

    // If suspended, all operational mutations are blocked
    if (sub.status === 'SUSPENDED') {
      return {
        allowed: false,
        reason: 'Subscription is suspended due to non-payment. Please renew your SaaS subscription to continue.',
      };
    }

    // If in grace period, basic intake is allowed, but expanding infrastructure is blocked
    if (sub.status === 'GRACE_PERIOD') {
      if (action === 'CHAMBER_ADD' || action === 'DOCTOR_ADD') {
        return {
          allowed: false,
          reason: 'Infrastructure expansion is locked while subscription is in grace period.',
        };
      }
      return { allowed: true };
    }

    switch (action) {
      case 'CHAMBER_ADD':
        if (currentCount >= sub.maxChambers) {
          return {
            allowed: false,
            reason: `Chamber quota reached (${sub.maxChambers} max for ${sub.tier} tier). Please upgrade your subscription.`,
          };
        }
        return { allowed: true };

      case 'DOCTOR_ADD':
        if (currentCount >= sub.maxDoctors) {
          return {
            allowed: false,
            reason: `Doctor affiliation quota reached (${sub.maxDoctors} max for ${sub.tier} tier). Please upgrade your subscription.`,
          };
        }
        return { allowed: true };

      case 'TV_STREAM':
        if (!sub.tvStreamAllowed) {
          return {
            allowed: false,
            reason: `Waiting Room TV live streaming requires Clinic Pro or Polyclinic Enterprise tier.`,
          };
        }
        return { allowed: true };

      case 'INTAKE_MUTATION':
      default:
        return { allowed: true };
    }
  }

  /**
   * Process Razorpay Webhook Event
   */
  public async handleWebhook(event: { event: string; payload: any }): Promise<{ handled: boolean; action: string }> {
    const { event: eventType, payload } = event;

    if (eventType === 'payment.captured') {
      const payment = payload?.payment?.entity;
      const clinicId = payment?.notes?.clinicId;
      const tier = payment?.notes?.planTier as PlanTier;

      if (clinicId && tier) {
        const sub = this.getOrCreateSubscription(clinicId, tier);
        sub.status = 'ACTIVE';
        sub.updatedAt = new Date().toISOString();
        return { handled: true, action: `Activated ${tier} subscription for clinic ${clinicId}` };
      }
    }

    if (eventType === 'subscription.halted') {
      const subEntity = payload?.subscription?.entity;
      const clinicId = subEntity?.notes?.clinicId;
      if (clinicId) {
        this.simulateGracePeriod(clinicId);
        return { handled: true, action: `Transitioned clinic ${clinicId} to GRACE_PERIOD` };
      }
    }

    return { handled: true, action: `Logged webhook event ${eventType}` };
  }

  /**
   * Test & Lifecycle Simulation Helpers
   */
  public simulateGracePeriod(clinicId: string): ClinicSubscription {
    const sub = this.getOrCreateSubscription(clinicId);
    const now = new Date();
    sub.status = 'GRACE_PERIOD';
    sub.gracePeriodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    sub.updatedAt = now.toISOString();
    return sub;
  }

  public simulateSuspension(clinicId: string): ClinicSubscription {
    const sub = this.getOrCreateSubscription(clinicId);
    sub.status = 'SUSPENDED';
    sub.updatedAt = new Date().toISOString();
    return sub;
  }

  public getInvoices(clinicId: string): BillingInvoiceDTO[] {
    return Array.from(this.invoices.values()).filter((inv) => inv.clinicId === clinicId);
  }

  public clearBillingData(): void {
    this.subscriptions.clear();
    this.invoices.clear();
    this.activeOrders.clear();
  }
}

export const billingService = new BillingService();
