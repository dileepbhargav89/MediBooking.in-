/**
 * MediBooking Front-Desk Offline Queue Buffer & Batch Sync Service
 * Implements Phase 25 resilient batch synchronization for internet dropouts in Bhopal clinics.
 */

import {
  BatchSyncIntakeDTO,
  BatchSyncResponse,
  BatchSyncResultItem,
  UserRole,
  PaymentStatus,
  PaymentMode,
  TriageSeverity,
  StaffScope,
} from '@medibooking/types';
import { appointmentService } from './appointment-service';
import { cashieringService } from './cashiering-service';
import { realtimeStreamManager } from './realtime-sse';

export interface SyncActor {
  userId: string;
  role: UserRole;
  activeClinicId?: string;
  name?: string;
  dedicatedDoctorId?: string;
  staffScope?: StaffScope;
}

export class OfflineSyncService {
  private batchCache = new Map<string, any>();

  public reset(): void {
    this.batchCache.clear();
  }

  /**
   * Process batch sync with batch-level idempotency replay caching
   */
  async processBatchSync(dto: any, actor: SyncActor) {
    const batchId = dto.batchId || dto.batchSyncId;
    if (batchId && this.batchCache.has(batchId)) {
      const cached = this.batchCache.get(batchId);
      return {
        ...cached,
        isReplay: true,
      };
    }

    const intakes = dto.intakes || dto.offlineItems || [];
    const normalizedDto: BatchSyncIntakeDTO = {
      clinicId: dto.clinicId,
      batchId: batchId || `batch-${Date.now()}`,
      syncedAt: dto.syncedAt || new Date().toISOString(),
      intakes,
    };

    const res = await this.syncBatch(normalizedDto, actor);

    const result = {
      ...res,
      syncedCount: res.synchronizedCount,
      rejectedCount: res.failedCount,
      isReplay: false,
    };

    if (batchId) {
      this.batchCache.set(batchId, result);
    }

    return result;
  }
  /**
   * Synchronize a batch of offline front-desk walk-in intakes
   */
  async syncBatch(dto: BatchSyncIntakeDTO, actor: SyncActor): Promise<BatchSyncResponse> {
    // 1. RBAC Guard: Doctor-Dedicated compounder can only sync intakes for their assigned doctor
    if (actor.staffScope === StaffScope.DOCTOR_DEDICATED && actor.dedicatedDoctorId) {
      const unauthorizedItem = dto.intakes.find((item) => item.doctorId !== actor.dedicatedDoctorId);
      if (unauthorizedItem) {
        throw new Error(
          `FORBIDDEN_SCOPE: Compounder is dedicated to doctor '${actor.dedicatedDoctorId}' and cannot sync intakes for doctor '${unauthorizedItem.doctorId}'.`
        );
      }
    }

    // 2. Sort intakes strictly chronologically by offlineRecordedAt ascending
    const sortedIntakes = [...dto.intakes].sort(
      (a, b) => new Date(a.offlineRecordedAt).getTime() - new Date(b.offlineRecordedAt).getTime()
    );

    const results: BatchSyncResultItem[] = [];
    let synchronizedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    for (const item of sortedIntakes) {
      try {
        // 3. Check Idempotency Replay
        const existingAppt = appointmentService.findByIdempotencyKey(item.idempotencyKey);
        if (existingAppt) {
          results.push({
            clientOfflineId: item.clientOfflineId,
            idempotencyKey: item.idempotencyKey,
            status: 'DUPLICATE_SKIPPED',
            appointmentId: existingAppt.id,
            assignedTokenNumber: existingAppt.tokenNumber,
            errorMessage: 'Intake already synchronized (idempotent duplicate skipped)',
          });
          duplicateCount++;
          continue;
        }

        // 4. Validate Indian Mobile
        const cleanMobile = item.patientPhone.trim().replace(/^(\+91|0)/, '');
        if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
          results.push({
            clientOfflineId: item.clientOfflineId,
            idempotencyKey: item.idempotencyKey,
            status: 'FAILED',
            errorMessage: 'INVALID_MOBILE: Phone must be a valid 10-digit Indian mobile number.',
          });
          failedCount++;
          continue;
        }

        const appointmentDate = item.offlineRecordedAt.split('T')[0] as string;

        // 5. Create Walk-In Intake as PENDING_AT_DESK initially (to be settled via Cashiering Service)
        const isImmediatePayment =
          item.paymentMode === PaymentMode.PAID_CASH ||
          item.paymentMode === PaymentMode.PAID_UPI_QR ||
          item.paymentMode === PaymentMode.WAIVED_BY_DOCTOR;

        const initialStatus = PaymentStatus.PENDING_AT_DESK;

        const { appointment } = await appointmentService.createWalkInIntake({
          clinicId: dto.clinicId,
          doctorId: item.doctorId,
          chamberNumber: item.chamberNumber,
          patientName: item.patientName,
          patientMobile: cleanMobile,
          patientAge: item.patientAge,
          patientGender: item.patientGender,
          triageSeverity: item.triageSeverity || TriageSeverity.ROUTINE,
          paymentMethod: initialStatus,
          amountRupees: item.amount,
          appointmentDate,
          idempotencyKey: item.idempotencyKey,
          allowDuplicate: true,
          emergencyOverride: true,
        });

        // 6. Process Payment in Cashiering Service if collected offline
        if (isImmediatePayment) {
          let targetPaymentStatus: PaymentStatus;
          if (item.paymentMode === PaymentMode.PAID_CASH) {
            targetPaymentStatus = PaymentStatus.PAID_CASH;
          } else if (item.paymentMode === PaymentMode.PAID_UPI_QR) {
            targetPaymentStatus = PaymentStatus.PAID_UPI_QR;
          } else {
            targetPaymentStatus = PaymentStatus.WAIVED_BY_DOCTOR;
          }

          await cashieringService.processPayment(
            dto.clinicId,
            {
              appointmentId: appointment.id,
              paymentMethod: targetPaymentStatus,
              amountRupees: item.amount,
              notes: `Offline intake synced from client buffer (${item.clientOfflineId})`,
            },
            {
              userId: actor.userId,
              role: actor.role,
              name: actor.name || 'Reception Staff',
              staffScope: actor.staffScope || StaffScope.CLINIC_WIDE,
              dedicatedDoctorId: actor.dedicatedDoctorId,
            }
          );
        }

        // 7. Broadcast chamber queue update across Redis Pub/Sub
        realtimeStreamManager.broadcastChamberUpdate(dto.clinicId, item.chamberNumber, {
          upNextTokens: [appointment.tokenNumber],
        });

        results.push({
          clientOfflineId: item.clientOfflineId,
          idempotencyKey: item.idempotencyKey,
          status: 'SYNCHRONIZED',
          appointmentId: appointment.id,
          assignedTokenNumber: appointment.tokenNumber,
        });
        synchronizedCount++;
      } catch (err: any) {
        results.push({
          clientOfflineId: item.clientOfflineId,
          idempotencyKey: item.idempotencyKey,
          status: 'FAILED',
          errorMessage: err.message || 'Unknown processing error',
        });
        failedCount++;
      }
    }

    return {
      batchId: dto.batchId,
      clinicId: dto.clinicId,
      totalSubmitted: dto.intakes.length,
      synchronizedCount,
      duplicateCount,
      failedCount,
      results,
      syncedAt: new Date().toISOString(),
    };
  }
}

export const offlineSyncService = new OfflineSyncService();
