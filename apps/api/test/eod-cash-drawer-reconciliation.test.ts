import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reconciliationService } from '../src/services/reconciliation-service';
import { cashieringService } from '../src/services/cashiering-service';
import { appointmentService } from '../src/services/appointment-service';
import { createApiServer } from '../src/server';
import { PaymentStatus, UserRole } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';

describe('Phase 32: End-of-Day Clinic Cash Drawer & Daily Token Reconciliation Summary', () => {
  const clinicId = SEED_DATA.clinic.id;
  const doctorId = SEED_DATA.doctors[0]!.doctorId;
  const today = new Date().toISOString().split('T')[0]!;

  beforeEach(() => {
    reconciliationService.clearSettlements();
    cashieringService.reset();
  });

  it('1. Physical Cash Variance correctly flags BALANCED, SHORTAGE, and SURPLUS', () => {
    // 1. Exact match -> BALANCED
    const balanced = reconciliationService.computeVariance(1500, 1500);
    assert.equal(balanced.discrepancyRupees, 0);
    assert.equal(balanced.status, 'BALANCED');

    // 2. Counted < Expected -> SHORTAGE
    const shortage = reconciliationService.computeVariance(1450, 1500, 'Cashier gave Rs. 50 extra change by mistake');
    assert.equal(shortage.discrepancyRupees, -50);
    assert.equal(shortage.status, 'SHORTAGE');
    assert.ok(shortage.notes?.includes('extra change'));

    // 3. Counted > Expected -> SURPLUS
    const surplus = reconciliationService.computeVariance(1520, 1500, 'Patient did not take Rs. 20 change');
    assert.equal(surplus.discrepancyRupees, 20);
    assert.equal(surplus.status, 'SURPLUS');
  });

  it('2. Daily Token Reconciliation aggregates statuses and booking channels', async () => {
    // Perform 2 walk-in intakes
    const intake1 = await appointmentService.createWalkInIntake({
      clinicId,
      doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Devendra Patel',
      patientMobile: '9826011111',
      paymentMethod: PaymentStatus.PAID_CASH,
      amountRupees: 500,
      appointmentDate: today,
    });

    const intake2 = await appointmentService.createWalkInIntake({
      clinicId,
      doctorId,
      chamberNumber: 'CH-1',
      patientName: 'Sunita Rao',
      patientMobile: '9826022222',
      paymentMethod: PaymentStatus.PAID_UPI_QR,
      amountRupees: 500,
      appointmentDate: today,
    });

    assert.ok(intake1.appointment);
    assert.ok(intake2.appointment);

    const tokenAudit = await reconciliationService.getDailyTokenReconciliation(clinicId, today);
    assert.ok(tokenAudit.totalTokensIssued >= 2);
    assert.ok(tokenAudit.walkInCount >= 2);
  });

  it('3. Shift Close locks the daily cash drawer and records immutable EOD settlement report', async () => {
    const actor = {
      userId: 'u1010000-0000-4000-8000-000000000001',
      name: 'Pooja Verma (Reception Desk)',
    };

    const settlement = await reconciliationService.closeShift(
      {
        clinicId,
        date: today,
        physicalCashCountedRupees: 500,
        notes: 'Shift 1 closed without cash variance',
      },
      actor
    );

    assert.equal(settlement.clinicId, clinicId);
    assert.equal(settlement.date, today);
    assert.equal(settlement.isLocked, true);
    assert.equal(settlement.closedByUserName, 'Pooja Verma (Reception Desk)');
    assert.ok(settlement.cashieringSummary);
    assert.ok(settlement.tokenReconciliation);
    assert.ok(settlement.drawerVariance);
  });

  it('4. Replay Lock Guard: Rejects second close-shift attempt on same date without supervisor override', async () => {
    const actor = {
      userId: 'u1010000-0000-4000-8000-000000000001',
      name: 'Pooja Verma',
    };

    // First close succeeds
    await reconciliationService.closeShift(
      {
        clinicId,
        date: today,
        physicalCashCountedRupees: 500,
      },
      actor
    );

    // Second close without override throws
    await assert.rejects(
      async () => {
        await reconciliationService.closeShift(
          {
            clinicId,
            date: today,
            physicalCashCountedRupees: 500,
          },
          actor
        );
      },
      /already closed and locked. Requires supervisor override/
    );

    // Second close WITH supervisor override succeeds
    const overridden = await reconciliationService.closeShift(
      {
        clinicId,
        date: today,
        physicalCashCountedRupees: 550,
        notes: 'Supervisor adjusted cash drawer',
        supervisorOverride: true,
      },
      actor
    );
    assert.equal(overridden.isLocked, true);
    assert.equal(overridden.drawerVariance.physicalCashCountedRupees, 550);
  });

  it('5. REST API: GET /reconciliation/report, POST /reconciliation/close-shift, and GET /reconciliation/history', async () => {
    const server = await createApiServer();

    // 1. Report preview
    const previewRes = await server.inject({
      method: 'GET',
      url: `/api/v1/cashiering/reconciliation/report?clinicId=${clinicId}&date=${today}&physicalCashCountedRupees=700`,
    });
    assert.equal(previewRes.statusCode, 200);
    const prevJson = JSON.parse(previewRes.body);
    assert.equal(prevJson.success, true);
    assert.equal(prevJson.report.variance.physicalCashCountedRupees, 700);

    // 2. Close shift
    const closeRes = await server.inject({
      method: 'POST',
      url: '/api/v1/cashiering/reconciliation/close-shift',
      payload: {
        clinicId,
        date: today,
        physicalCashCountedRupees: 700,
        notes: 'End of Day Close',
      },
    });
    assert.equal(closeRes.statusCode, 200);
    const closeJson = JSON.parse(closeRes.body);
    assert.equal(closeJson.success, true);
    assert.equal(closeJson.settlement.isLocked, true);

    // 3. Duplicate close without override returns 409 Conflict
    const dupRes = await server.inject({
      method: 'POST',
      url: '/api/v1/cashiering/reconciliation/close-shift',
      payload: {
        clinicId,
        date: today,
        physicalCashCountedRupees: 700,
      },
    });
    assert.equal(dupRes.statusCode, 409);

    // 4. History retrieval
    const historyRes = await server.inject({
      method: 'GET',
      url: `/api/v1/cashiering/reconciliation/history?clinicId=${clinicId}`,
    });
    assert.equal(historyRes.statusCode, 200);
    const histJson = JSON.parse(historyRes.body);
    assert.equal(histJson.success, true);
    assert.ok(histJson.history.length >= 1);

    await server.close();
  });
});
