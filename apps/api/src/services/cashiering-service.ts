import crypto from 'node:crypto';
import {
  PaymentLedgerEntry,
  ProcessPaymentDTO,
  CashieringSummary,
  CashieringFilterQuery,
  PaymentStatus,
  UserRole,
  StaffScope,
  Appointment,
} from '@medibooking/types';
import { appointmentService } from './appointment-service';
import { doctorService } from './doctor-service';

export interface CashieringReceiptData {
  receiptNumber: string;
  patientName: string;
  doctorName: string;
  chamberNumber: string;
  tokenNumber: number;
  amountRupees: number;
  paymentMethod: PaymentStatus;
  notes?: string;
  collectedBy: string;
  timestamp: string;
}

export class CashieringService {
  private ledger: Map<string, PaymentLedgerEntry> = new Map();

  /**
   * Process and settle an appointment payment (Cash, UPI Soundbox QR, or Doctor Fee Waiver)
   */
  async processPayment(
    clinicId: string,
    dto: ProcessPaymentDTO,
    actor: {
      userId: string;
      role: UserRole;
      name?: string;
      staffScope?: StaffScope;
      dedicatedDoctorId?: string;
    }
  ): Promise<{
    appointment: Appointment;
    ledgerEntry: PaymentLedgerEntry;
    receiptData: CashieringReceiptData;
  }> {
    const appointment = await appointmentService.getAppointmentById(dto.appointmentId);
    if (!appointment) {
      throw new Error(`Appointment ${dto.appointmentId} not found`);
    }

    if (appointment.clinicId !== clinicId) {
      throw new Error(`Unauthorized clinic context for appointment ${dto.appointmentId}`);
    }

    // Dual-Scope restriction: Doctor-dedicated staff cannot collect payments for other doctors
    if (
      actor.staffScope === StaffScope.DOCTOR_DEDICATED &&
      actor.dedicatedDoctorId &&
      appointment.doctorId !== actor.dedicatedDoctorId
    ) {
      throw new Error(`Forbidden: Staff scope restricted to assigned doctor ${actor.dedicatedDoctorId}`);
    }

    // Check if already paid or waived
    if (
      appointment.paymentStatus === PaymentStatus.PAID_CASH ||
      appointment.paymentStatus === PaymentStatus.PAID_UPI_QR ||
      appointment.paymentStatus === PaymentStatus.WAIVED_BY_DOCTOR
    ) {
      throw new Error(`PAYMENT_ALREADY_SETTLED: Appointment is already settled as ${appointment.paymentStatus}`);
    }

    // Resolve amount
    let finalAmount = appointment.amountRupees;
    if (dto.paymentMethod === PaymentStatus.WAIVED_BY_DOCTOR) {
      finalAmount = dto.amountRupees !== undefined ? dto.amountRupees : 0;
    } else if (dto.amountRupees !== undefined) {
      finalAmount = dto.amountRupees;
    }

    // Ensure unique receipt number
    const receiptNumber =
      appointment.receiptNumber ||
      `REC-${Date.now().toString().slice(-6)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

    // Update appointment
    const updatedAppointment = appointmentService.updateAppointment(appointment.id, {
      paymentStatus: dto.paymentMethod,
      amountRupees: finalAmount,
      receiptNumber,
      updatedAt: new Date().toISOString(),
    });

    if (!updatedAppointment) {
      throw new Error('Failed to update appointment payment status');
    }

    // Look up doctor name
    const doctor = await doctorService.getDoctorById(appointment.doctorId);
    const doctorName = doctor ? doctor.fullName : 'Doctor';

    // Record ledger entry
    const ledgerEntry: PaymentLedgerEntry = {
      id: `ledg-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
      clinicId,
      appointmentId: appointment.id,
      amountRupees: finalAmount,
      paymentMethod: dto.paymentMethod,
      collectedByUserId: actor.userId,
      collectorName: actor.name || 'Front Desk',
      patientName: appointment.patientName,
      patientMobile: appointment.patientMobile,
      tokenNumber: appointment.tokenNumber,
      chamberNumber: appointment.chamberNumber,
      doctorId: appointment.doctorId,
      doctorName,
      receiptNumber,
      notes: dto.notes,
      recordedAt: new Date().toISOString(),
    };

    this.ledger.set(ledgerEntry.id, ledgerEntry);

    const receiptData: CashieringReceiptData = {
      receiptNumber,
      patientName: appointment.patientName,
      doctorName,
      chamberNumber: appointment.chamberNumber,
      tokenNumber: appointment.tokenNumber,
      amountRupees: finalAmount,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      collectedBy: actor.name || 'Front Desk',
      timestamp: ledgerEntry.recordedAt,
    };

    return {
      appointment: updatedAppointment,
      ledgerEntry,
      receiptData,
    };
  }

  /**
   * Automatically record an entry in the ledger when an intake is settled upfront
   */
  recordIntakeLedger(
    appointment: Appointment,
    actorId?: string,
    collectorName?: string,
    doctorName?: string
  ): PaymentLedgerEntry {
    const ledgerEntry: PaymentLedgerEntry = {
      id: `ledg-${Date.now()}-${crypto.randomUUID().slice(0, 4)}`,
      clinicId: appointment.clinicId,
      appointmentId: appointment.id,
      amountRupees: appointment.amountRupees,
      paymentMethod: appointment.paymentStatus,
      collectedByUserId: actorId,
      collectorName: collectorName || 'Reception Desk',
      patientName: appointment.patientName,
      patientMobile: appointment.patientMobile,
      tokenNumber: appointment.tokenNumber,
      chamberNumber: appointment.chamberNumber,
      doctorId: appointment.doctorId,
      doctorName: doctorName || 'Doctor',
      receiptNumber: appointment.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      notes: 'Settled at reception walk-in intake',
      recordedAt: new Date().toISOString(),
    };

    this.ledger.set(ledgerEntry.id, ledgerEntry);
    return ledgerEntry;
  }

  /**
   * Query Payment Ledger Entries
   */
  getLedgerEntries(
    clinicId: string,
    filter?: CashieringFilterQuery,
    actorScope?: { staffScope?: StaffScope; dedicatedDoctorId?: string }
  ): PaymentLedgerEntry[] {
    const results: PaymentLedgerEntry[] = [];
    const targetDoctorId =
      actorScope?.staffScope === StaffScope.DOCTOR_DEDICATED
        ? actorScope.dedicatedDoctorId
        : filter?.doctorId;

    for (const entry of this.ledger.values()) {
      if (entry.clinicId !== clinicId) continue;

      if (filter?.date) {
        const entryDate = entry.recordedAt.split('T')[0];
        if (entryDate !== filter.date) continue;
      }

      if (targetDoctorId && entry.doctorId !== targetDoctorId) continue;
      if (filter?.paymentMethod && entry.paymentMethod !== filter.paymentMethod) continue;

      results.push(entry);
    }

    return results.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }

  /**
   * Calculate Cash Drawer / Daily Cashiering Summary
   */
  async getCashDrawerSummary(
    clinicId: string,
    date?: string,
    actorScope?: { staffScope?: StaffScope; dedicatedDoctorId?: string }
  ): Promise<CashieringSummary> {
    const targetDate = date || new Date().toISOString().split('T')[0]!;
    const targetDoctorId =
      actorScope?.staffScope === StaffScope.DOCTOR_DEDICATED
        ? actorScope.dedicatedDoctorId
        : undefined;

    // Filter relevant ledger entries
    const relevantEntries = Array.from(this.ledger.values()).filter((e) => {
      if (e.clinicId !== clinicId) return false;
      const entryDate = e.recordedAt.split('T')[0];
      if (entryDate !== targetDate) return false;
      if (targetDoctorId && e.doctorId !== targetDoctorId) return false;
      return true;
    });

    let cashTotal = 0;
    let upiTotal = 0;
    let waivedTotal = 0;
    let cashCount = 0;
    let upiCount = 0;
    let waivedCount = 0;

    const docMap = new Map<
      string,
      {
        doctorId: string;
        doctorName: string;
        chamberNumber: string;
        totalAmountRupees: number;
        cashAmountRupees: number;
        upiAmountRupees: number;
        waivedCount: number;
        patientCount: number;
      }
    >();

    for (const entry of relevantEntries) {
      if (entry.paymentMethod === PaymentStatus.PAID_CASH) {
        cashTotal += entry.amountRupees;
        cashCount++;
      } else if (entry.paymentMethod === PaymentStatus.PAID_UPI_QR) {
        upiTotal += entry.amountRupees;
        upiCount++;
      } else if (entry.paymentMethod === PaymentStatus.WAIVED_BY_DOCTOR) {
        waivedTotal += entry.amountRupees;
        waivedCount++;
      }

      const docSummary = docMap.get(entry.doctorId) || {
        doctorId: entry.doctorId,
        doctorName: entry.doctorName || 'Doctor',
        chamberNumber: entry.chamberNumber,
        totalAmountRupees: 0,
        cashAmountRupees: 0,
        upiAmountRupees: 0,
        waivedCount: 0,
        patientCount: 0,
      };

      if (entry.paymentMethod === PaymentStatus.PAID_CASH) {
        docSummary.cashAmountRupees += entry.amountRupees;
        docSummary.totalAmountRupees += entry.amountRupees;
      } else if (entry.paymentMethod === PaymentStatus.PAID_UPI_QR) {
        docSummary.upiAmountRupees += entry.amountRupees;
        docSummary.totalAmountRupees += entry.amountRupees;
      } else if (entry.paymentMethod === PaymentStatus.WAIVED_BY_DOCTOR) {
        docSummary.waivedCount++;
      }
      docSummary.patientCount++;
      docMap.set(entry.doctorId, docSummary);
    }

    // Also look up appointments for the day to compute pending at desk
    const dayAppointments = await appointmentService.getAppointmentsForDay(clinicId, targetDate);
    let pendingCount = 0;
    let pendingAmount = 0;

    for (const app of dayAppointments) {
      if (targetDoctorId && app.doctorId !== targetDoctorId) continue;
      if (app.paymentStatus === PaymentStatus.PENDING_AT_DESK) {
        pendingCount++;
        pendingAmount += app.amountRupees;
      }
    }

    return {
      clinicId,
      date: targetDate,
      totalCollectedRupees: cashTotal + upiTotal,
      cashTotalRupees: cashTotal,
      upiTotalRupees: upiTotal,
      waivedTotalRupees: waivedTotal,
      totalTransactionsCount: cashCount + upiCount + waivedCount,
      cashTransactionsCount: cashCount,
      upiTransactionsCount: upiCount,
      waivedTransactionsCount: waivedCount,
      pendingCount,
      pendingAmountRupees: pendingAmount,
      breakdownByDoctor: Array.from(docMap.values()),
    };
  }

  public reset(): void {
    this.ledger.clear();
  }
}

export const cashieringService = new CashieringService();
