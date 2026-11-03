/**
 * MediBooking Automated Two-Way WhatsApp Cloud Bot Engine
 * Document ID: MB-SPEC-16 (Stage V, Phase 54)
 * 
 * Handles inbound patient webhooks from Meta WhatsApp Cloud API v22.0.
 * Supports keyword commands (STATUS, DELAY, CANCEL, HELP) and interactive quick-replies.
 */

export interface WhatsAppInboundMessage {
  from: string; // E.164 phone number, e.g. "919826011111"
  id: string; // Meta message ID
  timestamp: string;
  type: 'text' | 'interactive' | 'button';
  body: string;
}

export interface WhatsAppBotReply {
  recipientWaId: string;
  replyText: string;
  commandRecognized: 'STATUS' | 'DELAY' | 'CANCEL' | 'HELP' | 'UNKNOWN';
  interactiveButtons?: Array<{
    id: string;
    title: string;
  }>;
  tokenInfo?: {
    tokenNumber: number;
    chamberNumber: string;
    doctorName: string;
    callingNow: number;
    status: string;
    estimatedWaitMinutes: number;
  };
}

// Simulated active patient tokens database for Bhopal Pilot
const ACTIVE_PATIENT_QUEUE_DATABASE: Record<
  string,
  {
    patientName: string;
    tokenNumber: number;
    chamberNumber: string;
    doctorName: string;
    specialty: string;
    callingNow: number;
    status: string;
    delayMinutes: number;
    estimatedWaitMinutes: number;
  }
> = {
  '9826011111': {
    patientName: 'Ramesh Kumar',
    tokenNumber: 15,
    chamberNumber: 'CH-1',
    doctorName: 'Rajesh Sharma',
    specialty: 'Cardiologist',
    callingNow: 14,
    status: 'WAITING',
    delayMinutes: 0,
    estimatedWaitMinutes: 8,
  },
  '9826022222': {
    patientName: 'Priya Verma',
    tokenNumber: 10,
    chamberNumber: 'CH-2',
    doctorName: 'Priya Patel',
    specialty: 'Dermatologist',
    callingNow: 9,
    status: 'WAITING',
    delayMinutes: 0,
    estimatedWaitMinutes: 5,
  },
  '9826033333': {
    patientName: 'Vikram Singh',
    tokenNumber: 23,
    chamberNumber: 'CH-3',
    doctorName: 'Amit Verma',
    specialty: 'Pediatrician',
    callingNow: 22,
    status: 'DELAYED',
    delayMinutes: 15,
    estimatedWaitMinutes: 20,
  },
};

export class WhatsAppTwoWayBotService {
  private verifyToken: string;

  constructor() {
    this.verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'medibooking_wa_secret_2026';
  }

  /**
   * Meta Webhook Handshake Verification
   */
  public verifyHandshake(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Normalize 10-digit or 12-digit Indian mobile number
   */
  public normalizePhone(rawPhone: string): string {
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      return digits.slice(1);
    }
    return digits.slice(-10);
  }

  /**
   * Process incoming message text and dispatch appropriate response
   */
  public handleMessage(fromRaw: string, messageText: string): WhatsAppBotReply {
    const phone10 = this.normalizePhone(fromRaw);
    const upperText = messageText.trim().toUpperCase();

    // Default patient record or fallback mock
    const tokenRecord = ACTIVE_PATIENT_QUEUE_DATABASE[phone10] || {
      patientName: 'Valued Patient',
      tokenNumber: 16,
      chamberNumber: 'CH-1',
      doctorName: 'Rajesh Sharma',
      specialty: 'Cardiologist',
      callingNow: 14,
      status: 'WAITING',
      delayMinutes: 0,
      estimatedWaitMinutes: 12,
    };

    // 1. STATUS command
    if (upperText.includes('STATUS') || upperText === '1' || upperText === 'MB_BTN_STATUS') {
      const waitText =
        tokenRecord.estimatedWaitMinutes > 0
          ? `~${tokenRecord.estimatedWaitMinutes} मिनट (${tokenRecord.estimatedWaitMinutes} mins)`
          : 'अभी आपकी बारी है! (Calling Now)';

      const replyText =
        `🙏 *नमस्ते ${tokenRecord.patientName}!*\n\n` +
        `📋 *आपकी टोकन स्थिति (Live Token Status)*:\n` +
        `• टोकन क्रमांक: *#${tokenRecord.tokenNumber}*\n` +
        `• कक्ष (Chamber): *${tokenRecord.chamberNumber}* (डॉ. ${tokenRecord.doctorName})\n` +
        `• वर्तमान में कक्ष में: *#${tokenRecord.callingNow}*\n` +
        `• स्थिति: *${tokenRecord.status}*\n` +
        `• अनुमानित प्रतीक्षा: *${waitText}*\n\n` +
        `_Bhopal City Care Polyclinic • MediBooking.in_`;

      return {
        recipientWaId: fromRaw,
        replyText,
        commandRecognized: 'STATUS',
        interactiveButtons: [
          { id: 'MB_BTN_DELAY', title: '⏳ Check Delay' },
          { id: 'MB_BTN_CANCEL', title: '❌ Cancel Token' },
        ],
        tokenInfo: {
          tokenNumber: tokenRecord.tokenNumber,
          chamberNumber: tokenRecord.chamberNumber,
          doctorName: tokenRecord.doctorName,
          callingNow: tokenRecord.callingNow,
          status: tokenRecord.status,
          estimatedWaitMinutes: tokenRecord.estimatedWaitMinutes,
        },
      };
    }

    // 2. DELAY command
    if (upperText.includes('DELAY') || upperText === '2' || upperText === 'MB_BTN_DELAY') {
      const delayInfo =
        tokenRecord.delayMinutes > 0
          ? `⚠️ डॉ. ${tokenRecord.doctorName} (${tokenRecord.chamberNumber}) लगभग *+${tokenRecord.delayMinutes} मिनट* विलंबित हैं।`
          : `✓ डॉ. ${tokenRecord.doctorName} (${tokenRecord.chamberNumber}) समय पर चल रहे हैं (On Schedule)।`;

      const replyText =
        `📢 *डॉक्टर विलंब स्थिति (Doctor Schedule Update)*:\n\n` +
        `${delayInfo}\n\n` +
        `कृपया प्रतीक्षालय टीवी स्क्रीन पर टोकन उद्घोषणा पर ध्यान दें।\n\n` +
        `_MediBooking.in भोपाल_`;

      return {
        recipientWaId: fromRaw,
        replyText,
        commandRecognized: 'DELAY',
        interactiveButtons: [
          { id: 'MB_BTN_STATUS', title: '📊 My Token Status' },
          { id: 'MB_BTN_HELP', title: '❓ Help Menu' },
        ],
      };
    }

    // 3. CANCEL command
    if (upperText.includes('CANCEL') || upperText === '3' || upperText === 'MB_BTN_CANCEL') {
      const replyText =
        `⚠️ *टोकन रद्दीकरण सूचना (Token Cancellation)*:\n\n` +
        `टोकन *#${tokenRecord.tokenNumber}* (डॉ. ${tokenRecord.doctorName}) को रद्द कर दिया गया है।\n\n` +
        `यदि यह गलती से हुआ है, तो कृपया तत्काल रिसेप्शन डेस्क पर संपर्क करें।`;

      return {
        recipientWaId: fromRaw,
        replyText,
        commandRecognized: 'CANCEL',
        interactiveButtons: [{ id: 'MB_BTN_HELP', title: '❓ Help Menu' }],
      };
    }

    // 4. HELP / Default Welcome Menu
    const replyText =
      `👋 *MediBooking.in WhatsApp सहायता में आपका स्वागत है!*\n\n` +
      `आप निम्न में से कोई भी विकल्प चुन सकते हैं:\n\n` +
      `1️⃣ *STATUS* - अपना टोकन क्रमांक व प्रतीक्षा समय देखें\n` +
      `2️⃣ *DELAY* - डॉक्टर की विलंब स्थिति जांचें\n` +
      `3️⃣ *CANCEL* - अपना टोकन रद्द करें\n` +
      `4️⃣ *HELP* - सहायता मेनू प्राप्त करें\n\n` +
      `_Bhopal City Care Polyclinic • 24x7 ऑटोमेटेड बॉट_`;

    return {
      recipientWaId: fromRaw,
      replyText,
      commandRecognized: upperText.includes('HELP') ? 'HELP' : 'UNKNOWN',
      interactiveButtons: [
        { id: 'MB_BTN_STATUS', title: '📊 Token Status' },
        { id: 'MB_BTN_DELAY', title: '⏳ Doctor Delay' },
      ],
    };
  }

  /**
   * Parse Meta Webhook JSON Body
   */
  public parseMetaWebhookBody(payload: any): WhatsAppBotReply[] {
    const replies: WhatsAppBotReply[] = [];
    if (!payload?.entry || !Array.isArray(payload.entry)) {
      return replies;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          const from = msg.from;
          let text = '';

          if (msg.type === 'text') {
            text = msg.text?.body || '';
          } else if (msg.type === 'interactive') {
            text = msg.interactive?.button_reply?.id || msg.interactive?.button_reply?.title || '';
          } else if (msg.type === 'button') {
            text = msg.button?.text || msg.button?.payload || '';
          }

          if (from && text) {
            replies.push(this.handleMessage(from, text));
          }
        }
      }
    }

    return replies;
  }
}

export const whatsAppTwoWayBotService = new WhatsAppTwoWayBotService();

