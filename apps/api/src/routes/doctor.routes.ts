/**
 * Doctor-First Discovery and Clinical Chamber Management Routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/tenant-context';
import { UserRole, DoctorDelayBroadcastDTO } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';
import { realtimeStreamManager } from '../services/realtime-sse';

const delayBroadcastSchema = z.object({
  clinicId: z.string().uuid(),
  doctorId: z.string().uuid(),
  delayMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  reasonOption: z.enum(['HOSPITAL_EMERGENCY', 'TRAFFIC_DELAY', 'EXTENDED_ROUNDS', 'PERSONAL_EMERGENCY']),
  customNote: z.string().optional(),
});

export async function doctorRoutes(fastify: FastifyInstance) {
  /**
   * Public Doctor-First Discovery: GET /api/v1/doctors/:slug
   * Returns doctor credentials, specialties, and all affiliated clinics with chamber numbers and consultation fees
   */
  fastify.get('/doctors/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const doctor = SEED_DATA.doctors.find((d) => d.slug === slug);

    if (!doctor) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Doctor with slug "${slug}" was not found`,
      });
    }

    // Compose response with doctor-first venue details
    return {
      doctor: {
        id: doctor.doctorId,
        fullName: doctor.fullName,
        slug: doctor.slug,
        registrationNumber: doctor.registrationNumber,
        stateMedicalCouncil: doctor.stateMedicalCouncil,
        specialties: doctor.specialties,
        qualifications: doctor.qualifications,
        experienceYears: doctor.experienceYears,
        bio: doctor.bio,
      },
      consultingVenues: [
        {
          clinicId: SEED_DATA.clinic.id,
          clinicName: SEED_DATA.clinic.name,
          locality: SEED_DATA.clinic.locality,
          city: SEED_DATA.clinic.city,
          addressLine: SEED_DATA.clinic.addressLine,
          chamberNumber: doctor.chamberNumber,
          consultationFeeRupees: doctor.consultationFee,
          followUpFeeRupees: doctor.followUpFee,
          sessions: doctor.sessions,
        },
      ],
    };
  });

  /**
   * 1-Click Delay Broadcast: POST /api/v1/doctor/delay-broadcast
   * Restricted to DOCTOR role
   */
  fastify.post(
    '/doctor/delay-broadcast',
    { preHandler: [requireAuth({ allowedRoles: [UserRole.DOCTOR, UserRole.CLINIC_ADMIN] })] },
    async (req, reply) => {
      const parseResult = delayBroadcastSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const payload: DoctorDelayBroadcastDTO = parseResult.data;

      // Broadcast to Waiting Room TV via SSE
      realtimeStreamManager.broadcastDoctorDelay(
        payload.clinicId,
        payload.doctorId,
        payload.delayMinutes,
        payload.reasonOption
      );

      return {
        success: true,
        message: `Delay broadcast of ${payload.delayMinutes} mins activated across chamber and waiting room screens`,
        timestamp: new Date().toISOString(),
      };
    }
  );
}

