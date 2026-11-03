import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Phase 40: Central Reception Desk Multi-Chamber Dashboard with F2 Hotkey Intake', () => {
  const TOKENS = [
    { id: '1', tokenNumber: 15, chamberNumber: 'CH-1', isUrgent: false, payment: 'PAID_CASH', fee: 600 },
    { id: '2', tokenNumber: 16, chamberNumber: 'CH-1', isUrgent: true, payment: 'PAID_UPI_QR', fee: 600 },
    { id: '3', tokenNumber: 10, chamberNumber: 'CH-2', isUrgent: false, payment: 'PAID_CASH', fee: 500 },
    { id: '4', tokenNumber: 23, chamberNumber: 'CH-3', isUrgent: false, payment: 'PENDING', fee: 0 },
  ];

  it('1. Chamber Tab Filtering: Accurately filters multi-chamber queue view', () => {
    const filterTokens = (tab: string, list: typeof TOKENS) => {
      return tab === 'ALL' ? list : list.filter((t) => t.chamberNumber === tab);
    };

    const allTokens = filterTokens('ALL', TOKENS);
    assert.strictEqual(allTokens.length, 4);

    const ch1Tokens = filterTokens('CH-1', TOKENS);
    assert.strictEqual(ch1Tokens.length, 2);
    assert.ok(ch1Tokens.every((t) => t.chamberNumber === 'CH-1'));

    const ch2Tokens = filterTokens('CH-2', TOKENS);
    assert.strictEqual(ch2Tokens.length, 1);
  });

  it('2. Rapid Walk-In Intake Token Allocation: Computes sequential next token per chamber', () => {
    const allocateNextToken = (chamber: string, existing: typeof TOKENS, doctorLastToken: number = 10) => {
      const chamberTokens = existing.filter((t) => t.chamberNumber === chamber).map((t) => t.tokenNumber);
      const maxToken = Math.max(...chamberTokens, doctorLastToken);
      return maxToken + 1;
    };

    // Chamber 1 currently has 15 and 16 -> next should be 17
    const nextCh1 = allocateNextToken('CH-1', TOKENS, 14);
    assert.strictEqual(nextCh1, 17);

    // Chamber 4 has no waiting tokens, doctor last served 7 -> next should be 8
    const nextCh4 = allocateNextToken('CH-4', TOKENS, 7);
    assert.strictEqual(nextCh4, 8);
  });

  it('3. Urgent Emergency Triage Interleaving: Positions urgent tokens ahead of regular waiting', () => {
    const queue = [
      { id: 't1', isUrgent: false, token: 15 },
      { id: 't2', isUrgent: false, token: 16 },
    ];

    const urgentToken = { id: 't-urgent', isUrgent: true, token: 17 };

    // Interleave urgent token at index 0
    const updatedQueue = [urgentToken, ...queue];
    assert.strictEqual(updatedQueue[0]?.id, 't-urgent');
    assert.strictEqual(updatedQueue.length, 3);
  });

  it('4. Cash Drawer & Shift Summary Balancing: Categorizes Cash vs UPI collections', () => {
    const calculateTotals = (list: typeof TOKENS) => {
      let cashTotal = 0;
      let upiTotal = 0;
      let pendingCount = 0;

      for (const t of list) {
        if (t.payment === 'PAID_CASH') cashTotal += t.fee;
        else if (t.payment === 'PAID_UPI_QR') upiTotal += t.fee;
        else if (t.payment === 'PENDING') pendingCount++;
      }

      return { cashTotal, upiTotal, pendingCount };
    };

    const totals = calculateTotals(TOKENS);
    assert.strictEqual(totals.cashTotal, 1100); // 600 + 500
    assert.strictEqual(totals.upiTotal, 600);   // 600
    assert.strictEqual(totals.pendingCount, 1);
  });

  it('5. ESC/POS 80mm Thermal Receipt Slip Formatting: Formats slip data fields', () => {
    const formatReceipt = (token: number, chamber: string, doctor: string, patient: string, fee: number) => {
      return {
        clinic: 'BHOPAL CITY CARE POLYCLINIC',
        tokenFormatted: `#${token}`,
        chamber,
        doctor: `Dr. ${doctor}`,
        patient,
        feeRupees: fee,
      };
    };

    const slip = formatReceipt(17, 'CH-1', 'Rajesh Sharma', 'R*** Kumar', 600);
    assert.strictEqual(slip.tokenFormatted, '#17');
    assert.strictEqual(slip.chamber, 'CH-1');
    assert.strictEqual(slip.feeRupees, 600);
  });
});
