/**
 * Public Slot Discovery, Batch Generator, & Concurrency Locking Routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { slotLockManager } from '../services/concurrency-engine';
import { slotService } from '../services/slot-service';
import { doctorService } from '../services/doctor-service';
import { affiliationService } from '../services/affiliation-service';
import { clinicService } from '../services/clinic-service';
import { requireAuth } from '../middleware/tenant-context';
import { UserRole, SlotStatus } from '@medibooking/types';

const lockSlotSchema = z.object({
  sessionId: z.string().min(8),
  ttlSeconds: z.number().int().min(60).max(600).optional().default(300),
});

const generateSlotsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  doctorId: z.string().uuid().optional(),
});

export async function slotRoutes(fastify: FastifyInstance) {
  /**
   * Public Available Slots: GET /api/v1/public/clinics/:clinicId/doctors/:doctorId/slots
   */
  fastify.get('/public/clinics/:clinicId/doctors/:doctorId/slots', async (req) => {
    const { clinicId, doctorId } = req.params as { clinicId: string; doctorId: string };
    const query = req.query as { date?: string };
    const date = query.date || (new Date().toISOString().split('T')[0] as string);

    const slots = await slotService.getSlotsByDate(clinicId, doctorId, date);

    // Fallback if doctor has no recurring sessions on that day: provide standard slots
    let formattedSlots;
    if (slots.length === 0) {
      const times = [
        '18:00', '18:15', '18:30', '18:45',
        '19:00', '19:15', '19:30', '19:45',
        '20:00', '20:15'
      ];
      formattedSlots = times.map((t, idx) => {
        const slotId = `slot-${clinicId.slice(0, 4)}-${doctorId.slice(0, 4)}-${idx + 1}`;
        const locked = slotLockManager.isLocked(slotId);
        return {
          id: slotId,
          clinicId,
          doctorId,
          chamberNumber: 'CH-1',
          slotDate: date,
          startTime: `${date}T${t}:00+05:30`,
          isAvailable: !locked,
          status: locked ? 'LOCKED' : 'AVAILABLE',
        };
      });
    } else {
      formattedSlots = slots.map((s) => ({
        id: s.id,
        clinicId: s.clinicId,
        doctorId: s.doctorId,
        chamberNumber: s.chamberNumber,
        slotDate: s.slotDate,
        startTime: s.startTime,
        isAvailable: s.status === SlotStatus.AVAILABLE,
        status: s.status,
      }));
    }

    return {
      clinicId,
      doctorId,
      date,
      slots: formattedSlots,
    };
  });

  /**
   * Batch Slot Generator: POST /api/v1/admin/clinics/:clinicId/slots/generate
   */
  fastify.post(
    '/admin/clinics/:clinicId/slots/generate',
    {
      preHandler: [requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] })],
    },
    async (req, reply) => {
      const { clinicId } = req.params as { clinicId: string };
      const parseResult = generateSlotsSchema.safeParse(req.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const { startDate, endDate, doctorId } = parseResult.data;
      const targetEnd = endDate || startDate;

      try {
        const generated = await slotService.generateSlotsForDateRange(clinicId, startDate, targetEnd, doctorId);
        return reply.status(201).send({
          success: true,
          message: `Generated ${generated.length} slots for clinic ${clinicId}`,
          count: generated.length,
          slots: generated,
        });
      } catch (err: any) {
        return reply.status(400).send({
          error: 'Generation Error',
          message: err.message,
        });
      }
    }
  );

  /**
   * Block specific slot: PATCH /api/v1/clinic/slots/:slotId/block
   */
  fastify.patch(
    '/clinic/slots/:slotId/block',
    {
      preHandler: [requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR] })],
    },
    async (req, reply) => {
      const { slotId } = req.params as { slotId: string };
      try {
        const blocked = await slotService.blockSlot(slotId);
        return reply.send({
          success: true,
          message: `Slot ${slotId} blocked from booking`,
          slot: blocked,
        });
      } catch (err: any) {
        return reply.status(404).send({ error: 'Not Found', message: err.message });
      }
    }
  );

  /**
   * 5-Minute Atomic Mutex Lock: POST /api/v1/public/slots/:slotId/lock
   */
  fastify.post('/public/slots/:slotId/lock', async (req, reply) => {
    const { slotId } = req.params as { slotId: string };
    const parseResult = lockSlotSchema.safeParse(req.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    const { sessionId, ttlSeconds } = parseResult.data;
    const lockResult = await slotLockManager.acquireLock(slotId, sessionId, ttlSeconds);

    if (!lockResult.acquired) {
      return reply.status(409).send({
        error: 'Conflict',
        message: lockResult.message,
        ttlSecondsRemaining: lockResult.ttlSecondsRemaining,
      });
    }

    return {
      success: true,
      ...lockResult,
    };
  });

  /**
   * Release Mutex Lock: POST /api/v1/public/slots/:slotId/release
   */
  fastify.post('/public/slots/:slotId/release', async (req, reply) => {
    const { slotId } = req.params as { slotId: string };
    const { sessionId } = (req.body as { sessionId?: string }) || {};

    if (!sessionId) {
      return reply.status(400).send({ error: 'sessionId is required to release lock' });
    }

    const released = await slotLockManager.releaseLock(slotId, sessionId);
    return {
      success: released,
      message: released ? 'Slot lock released' : 'No active lock found for this session',
    };
  });

  /**
   * Doctor-First Public Slot Query with Real-Time Mutex Lock Status & Availability Checking
   * GET /api/v1/public/doctors/:slug/slots
   */
  fastify.get('/public/doctors/:slug/slots', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const query = req.query as { date?: string; clinicId?: string; sessionId?: string };

    const doctor = await doctorService.getDoctorBySlug(slug);
    if (!doctor) {
      return reply.status(404).send({
        error: 'Doctor Not Found',
        message: `Doctor with slug '${slug}' was not found.`,
      });
    }

    const date = query.date || (new Date().toISOString().split('T')[0] as string);
    const callerSessionId = query.sessionId;

    // Get doctor's active clinic affiliations
    let affiliations = await affiliationService.getAffiliationsByDoctor(doctor.id, true);
    if (query.clinicId) {
      affiliations = affiliations.filter((a) => a.clinicId === query.clinicId);
    }

    const decoratedSlots: any[] = [];

    for (const aff of affiliations) {
      const clinicDetails = await clinicService.getClinicById(aff.clinicId);
      const clinicName = clinicDetails?.clinic.name || 'Consulting Clinic';
      const rawSlots = await slotService.getSlotsByDate(aff.clinicId, doctor.id, date);

      for (const slot of rawSlots) {
        const lockInfo = slotLockManager.getLockInfo(slot.id);
        const isLocked = lockInfo.isLocked;
        const isOwnedByCaller = Boolean(callerSessionId && lockInfo.sessionId === callerSessionId);

        let finalStatus = slot.status;
        if (isLocked) {
          finalStatus = SlotStatus.LOCKED;
        }

        const isSlotAvailableOnline =
          slot.status === SlotStatus.AVAILABLE || slot.status === SlotStatus.LOCKED;
        const isAvailable = isSlotAvailableOnline && (!isLocked || isOwnedByCaller);

        decoratedSlots.push({
          id: slot.id,
          clinicId: aff.clinicId,
          clinicName,
          chamberNumber: slot.chamberNumber,
          slotDate: slot.slotDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: finalStatus,
          isAvailable,
          isLocked,
          isOwnedByCaller,
          ttlSecondsRemaining: isLocked ? lockInfo.ttlSecondsRemaining : undefined,
          consultationFee: aff.consultationFeeRupees,
          followUpFee: aff.followUpFeeRupees,
        });
      }
    }

    // Sort by startTime
    decoratedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return {
      doctor: {
        id: doctor.id,
        fullName: doctor.fullName,
        slug: doctor.slug,
        specialties: doctor.specialties,
        qualifications: doctor.qualifications,
      },
      date,
      totalSlots: decoratedSlots.length,
      availableSlots: decoratedSlots.filter((s) => s.isAvailable).length,
      slots: decoratedSlots,
    };
  });

  /**
   * Real-Time Single Slot Availability Probe
   * GET /api/v1/public/slots/:slotId/availability
   */
  fastify.get('/public/slots/:slotId/availability', async (req, reply) => {
    const { slotId } = req.params as { slotId: string };
    const query = req.query as { sessionId?: string };
    const callerSessionId = query.sessionId;

    const slot = await slotService.getSlotById(slotId);
    if (!slot) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Slot with ID '${slotId}' was not found.`,
      });
    }

    const lockInfo = slotLockManager.getLockInfo(slot.id);
    const isLocked = lockInfo.isLocked;
    const isOwnedByCaller = Boolean(callerSessionId && lockInfo.sessionId === callerSessionId);

    let finalStatus = slot.status;
    if (isLocked) {
      finalStatus = SlotStatus.LOCKED;
    }

    const isSlotAvailableOnline =
      slot.status === SlotStatus.AVAILABLE || slot.status === SlotStatus.LOCKED;
    const isAvailable = isSlotAvailableOnline && (!isLocked || isOwnedByCaller);

    return {
      slotId: slot.id,
      clinicId: slot.clinicId,
      doctorId: slot.doctorId,
      chamberNumber: slot.chamberNumber,
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: finalStatus,
      isAvailable,
      isLocked,
      isOwnedByCaller,
      ttlSecondsRemaining: isLocked ? lockInfo.ttlSecondsRemaining : undefined,
    };
  });
}
