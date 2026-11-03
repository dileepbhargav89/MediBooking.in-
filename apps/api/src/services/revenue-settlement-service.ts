/**
 * Polyclinic Doctor Revenue Split & EOD Settlement Engine
 * Document ID: MB-SPEC-17 (Stage V, Phase 55)
 * 
 * Computes 80/20 doctor-clinic revenue sharing, Section 194J TDS deductions (10%),
 * and generates RBI NEFT / RTGS Corporate Cash Management System (CMS) batch files.
 */

export interface DoctorSettlementRecord {
  doctorId: string;
  doctorName: string;
  chamberNumber: string;
  specialty: string;
  totalConsultations: number;
  grossRevenueRupees: number;
  doctorSplitPercent: number; // typically 80%
  facilitySplitPercent: number; // typically 20%
  doctorShareRupees: number;
  facilityCommissionRupees: number;
  tdsRatePercent: number; // 10% under Section 194J
  tdsDeductionRupees: number;
  netPayoutRupees: number;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  payoutStatus: 'READY_FOR_PAYOUT' | 'SETTLED' | 'PROCESSING';
  payoutReference?: string;
  settledAt?: string;
}

export interface PolyclinicDailySplitSummary {
  clinicId: string;
  clinicName: string;
  settlementDate: string;
  totalPatientsConsulted: number;
  totalGrossRevenueRupees: number;
  totalDoctorShareRupees: number;
  totalFacilityCommissionRupees: number;
  totalTdsDeductedRupees: number;
  totalNetPayoutPayableRupees: number;
  doctorSettlements: DoctorSettlementRecord[];
}

export class RevenueSettlementService {
  private settlementsState: Map<string, DoctorSettlementRecord[]> = new Map();

  constructor() {
    this.seedDefaultSettlements();
  }

  private seedDefaultSettlements() {
    const defaultDoctors: DoctorSettlementRecord[] = [
      {
        doctorId: 'd1010000-0000-4000-8000-000000000001',
        doctorName: 'Dr. Rajesh Sharma',
        chamberNumber: 'CH-1',
        specialty: 'Cardiologist',
        totalConsultations: 22,
        grossRevenueRupees: 13200,
        doctorSplitPercent: 80,
        facilitySplitPercent: 20,
        doctorShareRupees: 10560,
        facilityCommissionRupees: 2640,
        tdsRatePercent: 10,
        tdsDeductionRupees: 1056,
        netPayoutRupees: 9504,
        bankName: 'HDFC Bank, MP Nagar Branch',
        bankAccountNumber: '50100238491023',
        ifscCode: 'HDFC0000284',
        payoutStatus: 'READY_FOR_PAYOUT',
        payoutReference: 'NEFT-CMS-014',
      },
      {
        doctorId: 'd1020000-0000-4000-8000-000000000002',
        doctorName: 'Dr. Priya Patel',
        chamberNumber: 'CH-2',
        specialty: 'Dermatologist',
        totalConsultations: 18,
        grossRevenueRupees: 9000,
        doctorSplitPercent: 80,
        facilitySplitPercent: 20,
        doctorShareRupees: 7200,
        facilityCommissionRupees: 1800,
        tdsRatePercent: 10,
        tdsDeductionRupees: 720,
        netPayoutRupees: 6480,
        bankName: 'State Bank of India, TT Nagar',
        bankAccountNumber: '382910482910',
        ifscCode: 'SBIN0001234',
        payoutStatus: 'READY_FOR_PAYOUT',
        payoutReference: 'NEFT-CMS-015',
      },
      {
        doctorId: 'd1030000-0000-4000-8000-000000000003',
        doctorName: 'Dr. Amit Verma',
        chamberNumber: 'CH-3',
        specialty: 'Pediatrician',
        totalConsultations: 15,
        grossRevenueRupees: 9000,
        doctorSplitPercent: 80,
        facilitySplitPercent: 20,
        doctorShareRupees: 7200,
        facilityCommissionRupees: 1800,
        tdsRatePercent: 10,
        tdsDeductionRupees: 720,
        netPayoutRupees: 6480,
        bankName: 'ICICI Bank, Arera Colony',
        bankAccountNumber: '003901592819',
        ifscCode: 'ICIC0000039',
        payoutStatus: 'SETTLED',
        payoutReference: 'UTR-NEFT-928172648',
        settledAt: '2026-11-03T18:00:00.000Z',
      },
      {
        doctorId: 'd1040000-0000-4000-8000-000000000004',
        doctorName: 'Dr. Sunita Rao',
        chamberNumber: 'CH-4',
        specialty: 'Orthopedic Surgeon',
        totalConsultations: 9,
        grossRevenueRupees: 6300,
        doctorSplitPercent: 80,
        facilitySplitPercent: 20,
        doctorShareRupees: 5040,
        facilityCommissionRupees: 1260,
        tdsRatePercent: 10,
        tdsDeductionRupees: 504,
        netPayoutRupees: 4536,
        bankName: 'Axis Bank, Kolar Road',
        bankAccountNumber: '918020038192019',
        ifscCode: 'UTIB0000456',
        payoutStatus: 'READY_FOR_PAYOUT',
        payoutReference: 'NEFT-CMS-016',
      },
    ];

    this.settlementsState.set('c1010000-0000-4000-8000-000000000001', defaultDoctors);
  }

  /**
   * Get Daily Revenue Split Summary for a Polyclinic
   */
  public getDailyRevenueSplit(
    clinicId: string = 'c1010000-0000-4000-8000-000000000001',
    date?: string
  ): PolyclinicDailySplitSummary {
    const list = this.settlementsState.get(clinicId) || [];

    const totalPatients = list.reduce((acc, d) => acc + d.totalConsultations, 0);
    const totalGross = list.reduce((acc, d) => acc + d.grossRevenueRupees, 0);
    const totalDoctor = list.reduce((acc, d) => acc + d.doctorShareRupees, 0);
    const totalCommission = list.reduce((acc, d) => acc + d.facilityCommissionRupees, 0);
    const totalTds = list.reduce((acc, d) => acc + d.tdsDeductionRupees, 0);
    const totalNetPayout = list.reduce((acc, d) => acc + d.netPayoutRupees, 0);

    return {
      clinicId,
      clinicName: 'Bhopal City Care Polyclinic',
      settlementDate: date || new Date().toISOString().slice(0, 10),
      totalPatientsConsulted: totalPatients,
      totalGrossRevenueRupees: totalGross,
      totalDoctorShareRupees: totalDoctor,
      totalFacilityCommissionRupees: totalCommission,
      totalTdsDeductedRupees: totalTds,
      totalNetPayoutPayableRupees: totalNetPayout,
      doctorSettlements: list,
    };
  }

  /**
   * Generate RFC-compliant NEFT / CMS Batch Payout CSV format
   */
  public generateNeftCmsBatch(clinicId: string = 'c1010000-0000-4000-8000-000000000001'): {
    csvContent: string;
    batchId: string;
    recordsCount: number;
    totalAmountRupees: number;
  } {
    const summary = this.getDailyRevenueSplit(clinicId);
    const batchId = `CMS-PAYOUT-${Date.now().toString().slice(-6)}`;

    // Headers conforming to standard HDFC/ICICI Corporate Cash Management Systems
    const headers = [
      'Record_Type',
      'Payment_Method',
      'Beneficiary_Name',
      'Account_Number',
      'IFSC_Code',
      'Amount_INR',
      'Chamber_Ref',
      'TDS_194J_Deducted',
      'Narration',
    ];

    const rows = summary.doctorSettlements.map((doc) => [
      'PAY',
      'NEFT',
      `"${doc.doctorName}"`,
      `"${doc.bankAccountNumber}"`,
      doc.ifscCode,
      doc.netPayoutRupees.toFixed(2),
      doc.chamberNumber,
      doc.tdsDeductionRupees.toFixed(2),
      `"Consultation Payout ${summary.settlementDate} Net of 10% TDS"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return {
      csvContent,
      batchId,
      recordsCount: summary.doctorSettlements.length,
      totalAmountRupees: summary.totalNetPayoutPayableRupees,
    };
  }

  /**
   * Mark a Doctor's payout as SETTLED
   */
  public markDoctorSettled(
    clinicId: string,
    doctorId: string,
    utrNumber?: string
  ): DoctorSettlementRecord | null {
    const list = this.settlementsState.get(clinicId);
    if (!list) return null;

    const item = list.find((d) => d.doctorId === doctorId);
    if (!item) return null;

    item.payoutStatus = 'SETTLED';
    item.payoutReference = utrNumber || `UTR-NEFT-${Date.now().toString().slice(-8)}`;
    item.settledAt = new Date().toISOString();
    return item;
  }
}

export const revenueSettlementService = new RevenueSettlementService();

