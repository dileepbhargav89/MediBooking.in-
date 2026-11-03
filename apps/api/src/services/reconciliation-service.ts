import { randomUUID } from 'crypto';
import {
  DailyTokenReconciliation,
  DrawerVarianceReport,
  EodSettlementRecord,
  CloseShiftDTO,
  CashieringSummary,
  ReconciliationDiscrepancyStatus,
  AppointmentStatus,
  BookingSource,
} from '@medibooking/types';
import { appointmentService } from './appointment-service';
import { cashieringService } from './cashiering-service';

export class ReconciliationService {
  // Key: `${clinicId}:${date}` -> EodSettlementRecord
  private settlements = new Map<string, EodSettlementRecord>();

  /**
   * Aggregate daily token statistics and footfall by status and source
   */
  public async getDailyTokenReconciliation(
    clinicId: string,
    date: string
  ): Promise<DailyTokenReconciliation> {
    const appointments = await appointmentService.getAppointmentsForDay(clinicId, date);

    let completedCount = 0;
    let waitingCount = 0;
    let inConsultationCount = 0;
    let noShowCount = 0;
    let cancelledCount = 0;
    let walkInCount = 0;
    let onlineBookingCount = 0;

    for (const app of appointments) {
      // By status
      if (app.status === AppointmentStatus.COMPLETED) {
        completedCount++;
      } else if (app.status === AppointmentStatus.WAITING || app.status === AppointmentStatus.ARRIVED) {
        waitingCount++;
      } else if (app.status === AppointmentStatus.IN_CONSULTATION) {
        inConsultationCount++;
      } else if (app.status === AppointmentStatus.NO_SHOW) {
        noShowCount++;
      } else if (
        app.status === AppointmentStatus.CANCELLED_PATIENT ||
        app.status === AppointmentStatus.CANCELLED_CLINIC
      ) {
        cancelledCount++;
      }

      // By source
      if (app.source === BookingSource.WALK_IN) {
        walkInCount++;
      } else if (
        app.source === BookingSource.ONLINE_PORTAL ||
        app.source === BookingSource.WHATSAPP
      ) {
        onlineBookingCount++;
      }
    }

    return {
      date,
      clinicId,
      totalTokensIssued: appointments.length,
      completedCount,
      waitingCount,
      inConsultationCount,
      noShowCount,
      cancelledCount,
      walkInCount,
      onlineBookingCount,
    };
  }

  /**
   * Calculate physical cash variance report against ledger expectations
   */
  public computeVariance(
    physicalCashCounted: number,
    systemCashExpected: number,
    notes?: string
  ): DrawerVarianceReport {
    const discrepancyRupees = physicalCashCounted - systemCashExpected;
    let status: ReconciliationDiscrepancyStatus = 'BALANCED';

    if (discrepancyRupees < 0) {
      status = 'SHORTAGE';
    } else if (discrepancyRupees > 0) {
      status = 'SURPLUS';
    }

    return {
      physicalCashCountedRupees: physicalCashCounted,
      systemCashExpectedRupees: systemCashExpected,
      discrepancyRupees,
      status,
      notes,
    };
  }

  /**
   * Generates real-time live or historical EOD settlement preview
   */
  public async generateEodPreview(
    clinicId: string,
    date?: string,
    physicalCashCountedRupees?: number,
    notes?: string
  ): Promise<{
    cashiering: CashieringSummary;
    tokenSummary: DailyTokenReconciliation;
    variance: DrawerVarianceReport;
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0]!;
    const cashiering = await cashieringService.getCashDrawerSummary(clinicId, targetDate);
    const tokenSummary = await this.getDailyTokenReconciliation(clinicId, targetDate);

    const physicalCount =
      physicalCashCountedRupees !== undefined
        ? physicalCashCountedRupees
        : cashiering.cashTotalRupees;

    const variance = this.computeVariance(physicalCount, cashiering.cashTotalRupees, notes);

    return {
      cashiering,
      tokenSummary,
      variance,
    };
  }

  /**
   * Closes the day's cashiering shift, locks the drawer, and records immutable EOD report
   */
  public async closeShift(
    dto: CloseShiftDTO,
    actor: { userId: string; name: string }
  ): Promise<EodSettlementRecord> {
    const targetDate = dto.date || new Date().toISOString().split('T')[0]!;
    const settlementKey = `${dto.clinicId}:${targetDate}`;

    if (this.settlements.has(settlementKey) && !dto.supervisorOverride) {
      throw new Error(
        `Shift for clinic ${dto.clinicId} on date ${targetDate} is already closed and locked. Requires supervisor override.`
      );
    }

    const preview = await this.generateEodPreview(
      dto.clinicId,
      targetDate,
      dto.physicalCashCountedRupees,
      dto.notes
    );

    const record: EodSettlementRecord = {
      id: randomUUID(),
      clinicId: dto.clinicId,
      date: targetDate,
      closedAt: new Date().toISOString(),
      closedByUserId: actor.userId,
      closedByUserName: actor.name,
      cashieringSummary: preview.cashiering,
      tokenReconciliation: preview.tokenSummary,
      drawerVariance: preview.variance,
      isLocked: true,
    };

    this.settlements.set(settlementKey, record);
    return record;
  }

  /**
   * Get historical settlement for a given clinic and date
   */
  public getSettlement(clinicId: string, date: string): EodSettlementRecord | null {
    const key = `${clinicId}:${date}`;
    return this.settlements.get(key) || null;
  }

  /**
   * Get all past settlements for a clinic sorted descending by date
   */
  public getSettlementHistory(clinicId: string): EodSettlementRecord[] {
    const results: EodSettlementRecord[] = [];
    for (const record of this.settlements.values()) {
      if (record.clinicId === clinicId) {
        results.push(record);
      }
    }
    return results.sort((a, b) => b.date.localeCompare(a.date));
  }

  public clearSettlements(): void {
    this.settlements.clear();
  }
}

export const reconciliationService = new ReconciliationService();
