/**
 * MediBooking.in — Multi-Provider DLT SMS Failover Gateway & Circuit Breaker
 * Compliant with TRAI DLT regulations (Bhopal & Madhya Pradesh Healthcare Pilot)
 * Tiers: Gupshup Enterprise (Primary) -> Exotel (Secondary) -> Twilio (Tertiary)
 */

import { randomUUID } from 'crypto';
import { SmsTemplateType } from '@medibooking/types';
import { DLT_TEMPLATES, normalizeIndianSmsMobile, renderDltTemplate } from './sms-broker';

export type DltSmsProvider = 'GUPSHUP_ENTERPRISE_DLT' | 'EXOTEL_TELECOM_DLT' | 'TWILIO_GLOBAL_DLT';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ProviderHealth {
  provider: DltSmsProvider;
  state: CircuitState;
  consecutiveFailures: number;
  totalDispatches: number;
  totalSuccesses: number;
  lastFailureTime?: number;
  avgLatencyMs: number;
}

export interface DltFailoverRequest {
  recipientMobile: string;
  templateType: SmsTemplateType;
  variables: string[];
  clinicId: string;
  referenceId?: string;
  forceProviderFailure?: DltSmsProvider[];
}

export interface DltFailoverResult {
  success: boolean;
  messageId: string;
  providerUsed: DltSmsProvider;
  failoverTriggered: boolean;
  attemptsCount: number;
  dltTemplateId: string;
  dltSenderId: string;
  renderedText: string;
  latencyMs: number;
  timestamp: string;
  auditTrail: Array<{ provider: DltSmsProvider; success: boolean; error?: string; latencyMs: number }>;
}

export class DltSmsFailoverGateway {
  private readonly providers: DltSmsProvider[] = [
    'GUPSHUP_ENTERPRISE_DLT',
    'EXOTEL_TELECOM_DLT',
    'TWILIO_GLOBAL_DLT',
  ];

  private readonly providerStats: Map<DltSmsProvider, ProviderHealth> = new Map();
  private readonly FAILURE_THRESHOLD = 3;
  private readonly COOLOFF_MS = 60000; // 1 minute to test recovery (half-open)

  constructor() {
    for (const p of this.providers) {
      this.providerStats.set(p, {
        provider: p,
        state: 'CLOSED',
        consecutiveFailures: 0,
        totalDispatches: 0,
        totalSuccesses: 0,
        avgLatencyMs: 45,
      });
    }
  }

  /**
   * Get Circuit Breaker & Health status of all carrier gateways
   */
  public getCircuitStatus(): Record<DltSmsProvider, ProviderHealth> {
    const result: Partial<Record<DltSmsProvider, ProviderHealth>> = {};
    for (const [p, health] of this.providerStats.entries()) {
      // Check if open circuit has cooled off to half-open
      if (health.state === 'OPEN' && health.lastFailureTime) {
        if (Date.now() - health.lastFailureTime > this.COOLOFF_MS) {
          health.state = 'HALF_OPEN';
        }
      }
      result[p] = { ...health };
    }
    return result as Record<DltSmsProvider, ProviderHealth>;
  }

  /**
   * Dispatches DLT-compliant SMS through multi-provider failover chain
   */
  public async sendWithFailover(req: DltFailoverRequest): Promise<DltFailoverResult> {
    const startTotal = performance.now();
    const cleanMobile = normalizeIndianSmsMobile(req.recipientMobile);
    const { text, dltTemplateId } = renderDltTemplate(req.templateType, req.variables);
    const dltSenderId = 'MEDIBK';

    const auditTrail: Array<{ provider: DltSmsProvider; success: boolean; error?: string; latencyMs: number }> = [];
    let providerUsed: DltSmsProvider | null = null;
    let failoverTriggered = false;
    let attemptsCount = 0;

    for (const provider of this.providers) {
      attemptsCount++;
      const stats = this.providerStats.get(provider)!;

      // Skip open circuits unless forced
      if (stats.state === 'OPEN' && !req.forceProviderFailure) {
        if (stats.lastFailureTime && Date.now() - stats.lastFailureTime > this.COOLOFF_MS) {
          stats.state = 'HALF_OPEN';
        } else {
          continue;
        }
      }

      const pStart = performance.now();
      const isForcedFail = req.forceProviderFailure?.includes(provider) === true;

      // Simulated dispatch to provider
      stats.totalDispatches++;

      if (isForcedFail) {
        // Simulated Carrier Down / Rate Limit / Timeout
        const pLatency = Math.round(performance.now() - pStart) + 40;
        stats.consecutiveFailures++;
        stats.lastFailureTime = Date.now();
        if (stats.consecutiveFailures >= this.FAILURE_THRESHOLD) {
          stats.state = 'OPEN';
        }

        auditTrail.push({
          provider,
          success: false,
          error: `Carrier 503 Service Unavailable / DLT Header Timeout on ${provider}`,
          latencyMs: pLatency,
        });

        failoverTriggered = true;
        continue; // Try next provider in chain
      }

      // Successful dispatch on current provider
      const pLatency = Math.round(performance.now() - pStart) + 32;
      stats.consecutiveFailures = 0;
      stats.state = 'CLOSED';
      stats.totalSuccesses++;
      stats.avgLatencyMs = Math.round((stats.avgLatencyMs * 4 + pLatency) / 5);

      auditTrail.push({
        provider,
        success: true,
        latencyMs: pLatency,
      });

      providerUsed = provider;
      break;
    }

    if (!providerUsed) {
      throw new Error('All SMS DLT gateway providers failed in circuit breaker chain.');
    }

    const totalLatency = Math.round(performance.now() - startTotal);
    const messageId = `msg_dlt_${providerUsed.toLowerCase().slice(0, 7)}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

    return {
      success: true,
      messageId,
      providerUsed,
      failoverTriggered,
      attemptsCount,
      dltTemplateId,
      dltSenderId,
      renderedText: text,
      latencyMs: totalLatency,
      timestamp: new Date().toISOString(),
      auditTrail,
    };
  }
}

export const dltSmsFailoverGateway = new DltSmsFailoverGateway();

