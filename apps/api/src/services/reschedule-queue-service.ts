/**
 * MediBooking Enterprise 14-Day VIP Priority Reschedule Queue Service
 * Manages zero-fee priority rescheduling for patients affected by clinic-initiated session cancellations
 * (Phase 22)
 */

import crypto from 'node:crypto';
import {
  Appointment,
  AppointmentStatus,
  BookingSource,
  ClaimVipRescheduleDTO,
  EligibleRescheduleItem,
  PaymentStatus,
  StaffScope,
  TriageSeverity,
  UserRole,
  VipRescheduleResult,
} from '@medibooking/types';
import { appointmentService } from './appointment-service';
import { doctorService } from './doctor-service';
import { affiliationService } from './affiliation-service';

export class RescheduleQueueService {
  /**
   * Get all appointments eligible for VIP priority rescheduling in a clinic
   */
  async getEligibleAppointments(
    clinicId: string,
    filter?: { doctorId?: string; mobile?: string }
  ): Promise<EligibleRescheduleItem[]> {
    const allAppointments = appointmentService.getAllAppointments();
    const nowIso = new Date().toISOString();
    const nowTime = Date.now();

    const eligible = allAppointments.filter((a) => {
      if (a.clinicId !== clinicId) return false;
      if (a.status !== AppointmentStatus.CANCELLED_CLINIC) return false;
      if (!a.rescheduleEligibleUntil || a.rescheduleEligibleUntil < nowIso) return false;
      if (a.rescheduledToAppointmentId) return false; // Already claimed

      if (filter?.doctorId && a.doctorId !== filter.doctorId) return false;
      if (filter?.mobile && a.patientMobile !== filter.mobile.trim()) return false;

      return true;
    });

    const result: EligibleRescheduleItem[] = [];
    for (const appt of eligible) {
      const doc = await doctorService.getDoctorById(appt.doctorId);
      const expiryTime = new Date(appt.rescheduleEligibleUntil!).getTime();
      const daysRemaining = Math.max(0, Math.ceil((expiryTime - nowTime) / (1000 * 60 * 60 * 24)));

      result.push({
        appointmentId: appt.id,
        clinicId: appt.clinicId,
        doctorId: appt.doctorId,
        doctorName: doc ? doc.fullName : 'Consultant Doctor',
        patientName: appt.patientName,
        patientMobile: appt.patientMobile,
        originalDate: appt.appointmentDate,
        originalTokenNumber: appt.tokenNumber,
        cancellationReason: appt.cancellationReason,
        rescheduleEligibleUntil: appt.rescheduleEligibleUntil!,
        daysRemaining,
        originalPaymentStatus: appt.paymentStatus,
      });
    }

    // Sort by expiration date ascending (soonest expiring first)
    result.sort((a, b) => a.rescheduleEligibleUntil.localeCompare(b.rescheduleEligibleUntil));
    return result;
  }

  /**
   * Check eligibility status for a single appointment
   */
  async checkEligibility(
    appointmentId: string
  ): Promise<{ isEligible: boolean; appointment?: Appointment; reason?: string }> {
    const appt = await appointmentService.getAppointmentById(appointmentId);
    if (!appt) {
      return { isEligible: false, reason: 'Appointment not found' };
    }

    if (appt.status !== AppointmentStatus.CANCELLED_CLINIC) {
      return {
        isEligible: false,
        appointment: appt,
        reason: `Appointment status is '${appt.status}', only 'CANCELLED_CLINIC' appointments qualify for VIP rescheduling.`,
      };
    }

    if (appt.rescheduledToAppointmentId) {
      return {
        isEligible: false,
        appointment: appt,
        reason: `Appointment has already been rescheduled (New Appointment ID: ${appt.rescheduledToAppointmentId}).`,
      };
    }

    const nowIso = new Date().toISOString();
    if (!appt.rescheduleEligibleUntil || appt.rescheduleEligibleUntil < nowIso) {
      return {
        isEligible: false,
        appointment: appt,
        reason: 'The 14-day VIP priority reschedule eligibility window has expired.',
      };
    }

    return {
      isEligible: true,
      appointment: appt,
    };
  }

  /**
   * Claim VIP Priority Reschedule
   */
  async claimVipReschedule(
    dto: ClaimVipRescheduleDTO,
    actor: {
      userId: string;
      role: UserRole;
      staffScope?: StaffScope;
      dedicatedDoctorId?: string;
    }
  ): Promise<VipRescheduleResult> {
    const eligibility = await this.checkEligibility(dto.cancelledAppointmentId);
    if (!eligibility.isEligible || !eligibility.appointment) {
      throw new Error(eligibility.reason || 'Appointment is not eligible for priority reschedule.');
    }

    const orig = eligibility.appointment;

    // 1. Staff Scope Check
    if (
      actor.staffScope === StaffScope.DOCTOR_DEDICATED &&
      actor.dedicatedDoctorId &&
      orig.doctorId !== actor.dedicatedDoctorId
    ) {
      throw new Error(
        `Forbidden: Dedicated compounder scope restricted to doctor '${actor.dedicatedDoctorId}'. Cross-doctor reschedule forbidden.`
      );
    }

    // 2. Resolve Doctor & Affiliation
    const doc = await doctorService.getDoctorById(orig.doctorId);
    const affiliation = await affiliationService.getAffiliation(orig.clinicId, orig.doctorId);
    const chamberNumber =
      dto.targetChamberNumber || affiliation?.chamberNumber || orig.chamberNumber || 'CH-1';

    // 3. Sequential Token Allocation for Target Date & Chamber
    const existingDayAppts = appointmentService.getActiveAppointmentsForClinic(
      orig.clinicId,
      dto.targetDate
    );
    const chamberAppts = existingDayAppts.filter(
      (a) => a.chamberNumber === chamberNumber && a.doctorId === orig.doctorId
    );
    const nextTokenNumber = chamberAppts.length + 1;

    // 4. Zero-Fee Invariant: Carry over paid consultation status
    const wasPaid =
      orig.paymentStatus === PaymentStatus.PAID_CASH ||
      orig.paymentStatus === PaymentStatus.PAID_UPI_QR;
    const newPaymentStatus = wasPaid ? orig.paymentStatus : PaymentStatus.PENDING_AT_DESK;
    const feeWaived = wasPaid;

    const nowIso = new Date().toISOString();
    const newId = crypto.randomUUID();

    // 5. Create new VIP rescheduled appointment
    const newAppointment: Appointment = {
      id: newId,
      clinicId: orig.clinicId,
      doctorId: orig.doctorId,
      patientId: orig.patientId,
      slotId: dto.targetSlotId || orig.slotId,
      chamberNumber,
      appointmentDate: dto.targetDate,
      tokenNumber: nextTokenNumber,
      status: AppointmentStatus.SCHEDULED,
      source: BookingSource.WALK_IN,
      paymentStatus: newPaymentStatus,
      amountRupees: wasPaid ? 0 : orig.amountRupees,
      triageSeverity: TriageSeverity.URGENT_TRIAGE, // Priority interleaves ahead of routine walk-ins!
      patientName: orig.patientName,
      patientMobile: orig.patientMobile,
      patientAge: orig.patientAge,
      receiptNumber: `VIP-${orig.receiptNumber || newId.slice(0, 6)}`,
      estimatedConsultTime: orig.estimatedConsultTime || '18:00',
      isVipPriorityReschedule: true,
      rescheduledFromAppointmentId: orig.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    appointmentService.addAppointment(newAppointment);

    // 6. Link original appointment so it cannot be double-claimed
    appointmentService.updateAppointment(orig.id, {
      rescheduledToAppointmentId: newAppointment.id,
      updatedAt: nowIso,
    });

    return {
      success: true,
      originalAppointmentId: orig.id,
      newAppointment,
      rescheduledDate: dto.targetDate,
      tokenNumber: nextTokenNumber,
      feeWaived,
      message: `VIP Priority Reschedule successful for ${orig.patientName}. Allocated Token #${nextTokenNumber} on ${dto.targetDate} (${doc?.fullName || 'Doctor'}). Consultation fee balance: ₹0.`,
      timestamp: nowIso,
    };
  }
}

export const rescheduleQueueService = new RescheduleQueueService();
