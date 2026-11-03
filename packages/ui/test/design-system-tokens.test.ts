import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DESIGN_TOKENS,
  getChamberStyle,
  getChamberStatusStyle,
  getTriageStyle,
  getPaymentBadgeStyle,
  getQueueStatusBadgeStyle,
} from '../src/index';

describe('Phase 33: Design System Tokens & Healthcare Theme Standards', () => {
  it('1. Healthcare Theme Tokens: Pure Crisp White, Royal Blue, Mint Green, and Amber', () => {
    // Primary Brand Blue
    assert.strictEqual(DESIGN_TOKENS.colors.primary.default, '#1D4ED8');
    assert.strictEqual(DESIGN_TOKENS.colors.primary.hover, '#1E40AF');
    assert.strictEqual(DESIGN_TOKENS.colors.primary.light, '#EFF6FF');

    // Backgrounds
    assert.strictEqual(DESIGN_TOKENS.colors.background.white, '#FFFFFF');
    assert.strictEqual(DESIGN_TOKENS.colors.background.secondary, '#F8FAFC');

    // Faded Mint Green (Success / Available)
    assert.strictEqual(DESIGN_TOKENS.colors.mint.default, '#10B981');
    assert.strictEqual(DESIGN_TOKENS.colors.mint.surface, '#D1FAE5');
    assert.strictEqual(DESIGN_TOKENS.colors.mint.text, '#047857');

    // Urgent Triage Amber / Red
    assert.strictEqual(DESIGN_TOKENS.colors.amber.default, '#F59E0B');
    assert.strictEqual(DESIGN_TOKENS.colors.amber.surface, '#FEF3C7');
    assert.strictEqual(DESIGN_TOKENS.colors.red.default, '#EF4444');
    assert.strictEqual(DESIGN_TOKENS.colors.red.surface, '#FEE2E2');
  });

  it('2. Chamber Identification Tokens: Distinct visual definitions for CH-1 through CH-4', () => {
    const ch1 = getChamberStyle('CH-1');
    const ch2 = getChamberStyle('CH-2');
    const ch3 = getChamberStyle('CH-3');
    const ch4 = getChamberStyle('CH-4');

    assert.strictEqual(ch1.name, 'Chamber 1');
    assert.strictEqual(ch2.name, 'Chamber 2');
    assert.strictEqual(ch3.name, 'Chamber 3');
    assert.strictEqual(ch4.name, 'Chamber 4');

    // Each chamber must have distinct accents
    const accents = new Set([ch1.accent, ch2.accent, ch3.accent, ch4.accent]);
    assert.strictEqual(accents.size, 4, 'All 4 chambers must have distinct visual accents');

    // Fallback for unlisted chamber
    const fallback = getChamberStyle('CH-99');
    assert.ok(fallback.bg);
    assert.ok(fallback.border);
  });

  it('3. Chamber Status Styles: ACTIVE, BREAK, DELAYED, OFFLINE', () => {
    const active = getChamberStatusStyle('ACTIVE');
    assert.strictEqual(active.label, 'In Session');
    assert.strictEqual(active.dot, '#10B981');

    const brk = getChamberStatusStyle('BREAK');
    assert.strictEqual(brk.label, 'Short Break');
    assert.strictEqual(brk.dot, '#F59E0B');

    const delayed = getChamberStatusStyle('DELAYED');
    assert.strictEqual(delayed.label, 'Delayed');
    assert.strictEqual(delayed.dot, '#F43F5E');

    const offline = getChamberStatusStyle('OFFLINE');
    assert.strictEqual(offline.label, 'Not Started');
  });

  it('4. Triage Urgency Styling: EMERGENCY, URGENT, and NORMAL', () => {
    const emergency = getTriageStyle(false, 'EMERGENCY');
    assert.strictEqual(emergency.label, 'EMERGENCY');
    assert.strictEqual(emergency.pulse, true);
    assert.strictEqual(emergency.dot, '#EF4444');

    const urgentFlag = getTriageStyle(true);
    assert.strictEqual(urgentFlag.label, 'URGENT');
    assert.strictEqual(urgentFlag.pulse, false);
    assert.strictEqual(urgentFlag.dot, '#F59E0B');

    const normal = getTriageStyle(false, 'NORMAL');
    assert.strictEqual(normal.label, 'NORMAL');
    assert.strictEqual(normal.pulse, false);
  });

  it('5. Payment Badge Styling: Cash, UPI, Waived, and Pending', () => {
    const cash = getPaymentBadgeStyle('PAID_CASH');
    assert.strictEqual(cash.label, 'Paid (Cash)');

    const upi = getPaymentBadgeStyle('PAID_UPI_QR');
    assert.strictEqual(upi.label, 'Paid (UPI)');

    const waived = getPaymentBadgeStyle('WAIVED');
    assert.strictEqual(waived.label, 'Waived');

    const pending = getPaymentBadgeStyle('PENDING');
    assert.strictEqual(pending.label, 'Unpaid at Desk');
  });

  it('6. Queue Status Badge Styling: Full lifecycle state coverage', () => {
    const inConsultation = getQueueStatusBadgeStyle('IN_CONSULTATION');
    assert.strictEqual(inConsultation.label, 'In Consultation');

    const waiting = getQueueStatusBadgeStyle('WAITING');
    assert.strictEqual(waiting.label, 'In Waiting Area');

    const arrived = getQueueStatusBadgeStyle('ARRIVED');
    assert.strictEqual(arrived.label, 'Checked In');

    const completed = getQueueStatusBadgeStyle('COMPLETED');
    assert.strictEqual(completed.label, 'Completed');

    const cancelled = getQueueStatusBadgeStyle('CANCELLED');
    assert.strictEqual(cancelled.label, 'Cancelled');
  });

  it('7. Typography & Card Design Specifications: Tabular numerals and subtle borders', () => {
    assert.strictEqual(DESIGN_TOKENS.typography.tabularNums, 'tabular-nums');
    assert.ok(DESIGN_TOKENS.classes.card.includes('border-slate-200'));
    assert.ok(DESIGN_TOKENS.classes.card.includes('rounded-xl'));
    assert.ok(DESIGN_TOKENS.classes.card.includes('shadow-sm'));
  });
});
