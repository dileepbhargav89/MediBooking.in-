/**
 * MediBooking WhatsApp Business Cloud API Outbound Notification Broker
 * Interfaces directly with Meta Graph API v22.0 to deliver real-time booking slips,
 * token allocations, doctor delay broadcasts, and emergency cancellation notices.
 */

import {
  WhatsAppNotificationDTO,
  WhatsAppMessageResult,
  WhatsAppAuditRecord,
  WhatsAppTemplateType,
} from '@medibooking/types';
import { ENV } from '../config/env';

export class WhatsAppBroker {
  private accessToken?: string;
  private phoneNumberId?: string;
  private apiVersion: string;
  private auditHistory: WhatsAppAuditRecord[] = [];
  private forceSimulation: boolean = false;

  constructor(opts?: {
    accessToken?: string;
    phoneNumberId?: string;
    apiVersion?: string;
    forceSimulation?: boolean;
  }) {
    this.accessToken = opts?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || ENV.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = opts?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || ENV.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = opts?.apiVersion || process.env.WHATSAPP_API_VERSION || ENV.WHATSAPP_API_VERSION || 'v22.0';
    this.forceSimulation = opts?.forceSimulation ?? (process.env.NODE_ENV === 'test');
  }

  /**
   * Format Indian Mobile Number to E.164 (12 digits e.g. 919826012345)
   */
  public formatToE164IndianPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits;
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      return `91${digits.slice(1)}`;
    }
    return digits;
  }

  /**
   * Builds Meta Cloud API template components from parameters map
   */
  public buildTemplateComponents(
    template: WhatsAppTemplateType,
    params: Record<string, string | number>
  ): any[] {
    const bodyParameters: Array<{ type: 'text'; text: string }> = [];

    // Map named parameters into sequential template variables
    if (template === 'booking_confirmation_v1') {
      // 1: Patient Name, 2: Doctor Name, 3: Specialty, 4: Chamber, 5: Token, 6: Date/Time
      bodyParameters.push({ type: 'text', text: String(params.patientName || 'Patient') });
      bodyParameters.push({ type: 'text', text: String(params.doctorName || 'Doctor') });
      bodyParameters.push({ type: 'text', text: String(params.specialty || 'OPD') });
      bodyParameters.push({ type: 'text', text: String(params.chamberNumber || 'CH-1') });
      bodyParameters.push({ type: 'text', text: String(params.tokenNumber || '1') });
      bodyParameters.push({ type: 'text', text: String(params.appointmentTime || params.date || 'Today') });
    } else if (template === 'doctor_delay_v1') {
      // 1: Doctor Name, 2: Delay Minutes, 3: Reason, 4: Updated ETA
      bodyParameters.push({ type: 'text', text: String(params.doctorName || 'Doctor') });
      bodyParameters.push({ type: 'text', text: String(params.delayMinutes || '15') });
      bodyParameters.push({ type: 'text', text: String(params.reason || 'Hospital Rounds') });
      bodyParameters.push({ type: 'text', text: String(params.updatedEta || 'Soon') });
    } else if (template === 'session_cancelled_v1') {
      // 1: Doctor Name, 2: Cancellation Reason, 3: Reschedule URL
      bodyParameters.push({ type: 'text', text: String(params.doctorName || 'Doctor') });
      bodyParameters.push({ type: 'text', text: String(params.reason || 'Emergency') });
      bodyParameters.push({ type: 'text', text: String(params.rescheduleUrl || 'https://medibooking.in/reschedule') });
    } else if (template === 'walkin_intake_v1') {
      // 1: Patient Name, 2: Doctor Name, 3: Chamber, 4: Token
      bodyParameters.push({ type: 'text', text: String(params.patientName || 'Patient') });
      bodyParameters.push({ type: 'text', text: String(params.doctorName || 'Doctor') });
      bodyParameters.push({ type: 'text', text: String(params.chamberNumber || 'CH-1') });
      bodyParameters.push({ type: 'text', text: String(params.tokenNumber || '1') });
    } else {
      // Generic parameters
      for (const val of Object.values(params)) {
        bodyParameters.push({ type: 'text', text: String(val) });
      }
    }

    return [
      {
        type: 'body',
        parameters: bodyParameters,
      },
    ];
  }

  /**
   * Send WhatsApp template notification
   */
  public async sendNotification(dto: WhatsAppNotificationDTO): Promise<WhatsAppMessageResult> {
    const formattedRecipient = this.formatToE164IndianPhone(dto.recipientMobile);
    const now = new Date().toISOString();

    // 1. Simulation Mode Check (for tests, dev, or offline clinics)
    if (this.forceSimulation || dto.simulate || !this.accessToken || !this.phoneNumberId) {
      const simulatedWamid = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 8)}==`;
      const result: WhatsAppMessageResult = {
        success: true,
        wamid: simulatedWamid,
        recipient: formattedRecipient,
        status: 'SIMULATED',
        shouldFallbackToSms: false,
        timestamp: now,
      };

      this.recordAudit(dto, result);
      return result;
    }

    // 2. Real Meta Cloud API HTTP Request
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    const components = this.buildTemplateComponents(dto.template, dto.parameters);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedRecipient,
      type: 'template',
      template: {
        name: dto.template,
        language: { code: dto.language || 'en_US' },
        components,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        const errorCode = data?.error?.code;
        const errorMessage = data?.error?.message || response.statusText;
        // Meta Error 131026: Receiver is not on WhatsApp -> Flag for SMS Fallback
        const shouldFallbackToSms = errorCode === 131026 || errorCode === 131000;

        const result: WhatsAppMessageResult = {
          success: false,
          recipient: formattedRecipient,
          status: shouldFallbackToSms ? 'FALLBACK_TO_SMS' : 'FAILED',
          shouldFallbackToSms,
          errorCode,
          errorMessage,
          timestamp: now,
        };

        this.recordAudit(dto, result);
        return result;
      }

      const wamid = data?.messages?.[0]?.id || `wamid.OK_${Date.now()}`;
      const result: WhatsAppMessageResult = {
        success: true,
        wamid,
        recipient: formattedRecipient,
        status: 'SENT',
        shouldFallbackToSms: false,
        timestamp: now,
      };

      this.recordAudit(dto, result);
      return result;
    } catch (err: any) {
      const result: WhatsAppMessageResult = {
        success: false,
        recipient: formattedRecipient,
        status: 'FALLBACK_TO_SMS',
        shouldFallbackToSms: true,
        errorMessage: err.message || 'Network transport timeout',
        timestamp: now,
      };

      this.recordAudit(dto, result);
      return result;
    }
  }

  private recordAudit(dto: WhatsAppNotificationDTO, result: WhatsAppMessageResult) {
    const record: WhatsAppAuditRecord = {
      id: `wnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clinicId: dto.clinicId,
      appointmentId: dto.appointmentId,
      recipientMobile: dto.recipientMobile,
      template: dto.template,
      result,
      sentAt: result.timestamp,
    };

    this.auditHistory.push(record);
    if (this.auditHistory.length > 500) {
      this.auditHistory.shift();
    }
  }

  public getHistory(clinicId?: string): WhatsAppAuditRecord[] {
    if (!clinicId) return [...this.auditHistory];
    return this.auditHistory.filter((r) => r.clinicId === clinicId);
  }

  public reset(): void {
    this.auditHistory = [];
  }
}

export const whatsappBroker = new WhatsAppBroker();
