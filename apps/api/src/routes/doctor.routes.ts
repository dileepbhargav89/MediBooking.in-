/**
 * Doctor-First Discovery, NMC Verification Registry, and Clinical Chamber Routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAuth } from '../middleware/tenant-context';
import { UserRole, MedicalSpecialty, DoctorDelayBroadcastDTO } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';
import { realtimeStreamManager } from '../services/realtime-sse';
import { doctorService } from '../services/doctor-service';
import { affiliationService } from '../services/affiliation-service';
import { clinicService } from '../services/clinic-service';
import { sessionService } from '../services/session-service';
import { delayBroadcastEngine } from '../services/delay-broadcast-engine';
import { authService } from '../services/auth-service';

const delayBroadcastSchema = z.object({
  clinicId: z.string().uuid(),
  doctorId: z.string().uuid(),
  delayMinutes: z.number().int().min(0).max(240),
  reasonOption: z.string().default('HOSPITAL_EMERGENCY'),
  customNote: z.string().optional(),
});

const onboardDoctorSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  email: z.string().email().optional(),
  registrationNumber: z.string().min(3, 'NMC Registration number is required'),
  stateMedicalCouncil: z.string().min(3, 'State Medical Council is required'),
  specialties: z.array(z.nativeEnum(MedicalSpecialty)).min(1, 'Select at least 1 specialty'),
  qualifications: z.array(z.string()).min(1, 'At least 1 qualification required'),
  experienceYears: z.number().int().min(0).default(1),
  bio: z.string().optional(),
  clinicId: z.string().optional(),
  chamberNumber: z.string().default('CH-1'),
  consultationFeeRupees: z.number().positive().default(600),
  followUpFeeRupees: z.number().nonnegative().optional(),
  followUpValidityDays: z.number().int().positive().default(14),
  registrationYear: z.number().int().optional(),
  symptomKeywords: z.array(z.string()).optional(),
  shiftDays: z.array(z.number()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  splitRatioDoctor: z.number().min(0).max(1).optional().default(0.80),
});

const createDoctorSchema = z.object({
  fullName: z.string().min(3),
  slug: z.string().optional(),
  registrationNumber: z.string().min(3, 'Registration number must be provided'),
  stateMedicalCouncil: z.string().min(3, 'State Medical Council is required'),
  specialties: z.array(z.nativeEnum(MedicalSpecialty)).min(1),
  qualifications: z.array(z.string()).min(1),
  experienceYears: z.number().int().min(0).default(1),
  bio: z.string().optional(),
  profilePhotoUrl: z.string().url().optional(),
});

const verifyNmcSchema = z.object({
  isVerified: z.boolean(),
  auditNotes: z.string().optional(),
});

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  profilePhotoUrl: z.string().url().optional(),
  qualifications: z.array(z.string()).optional(),
  experienceYears: z.number().int().min(0).optional(),
  registrationNumber: z.string().optional(),
  stateMedicalCouncil: z.string().optional(),
});

export async function doctorRoutes(fastify: FastifyInstance) {
  /**
   * Self-Serve Doctor Onboarding & Chamber Affiliation: POST /api/v1/doctors/onboard-doctor
   * Public onboarding wizard endpoint for doctors
   */
  fastify.post('/doctors/onboard-doctor', async (req, reply) => {
    const parseResult = onboardDoctorSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    try {
      const data = parseResult.data;
      const targetClinicId = data.clinicId || SEED_DATA.clinic.id;
      const clinicDetails = await clinicService.getClinicById(targetClinicId);
      const clinicName = clinicDetails?.clinic.name || SEED_DATA.clinic.name;

      const doctorId = crypto.randomUUID();
      const userId = `usr-doc-${doctorId.slice(0, 8)}`;

      // 1. Create Doctor Master Profile
      const doctor = await doctorService.createDoctor({
        userId,
        fullName: data.fullName,
        registrationNumber: data.registrationNumber,
        stateMedicalCouncil: data.stateMedicalCouncil,
        registrationYear: data.registrationYear,
        symptomKeywords: data.symptomKeywords,
        specialties: data.specialties,
        qualifications: data.qualifications,
        experienceYears: data.experienceYears,
        bio: data.bio || `Specialist in ${data.specialties.join(', ')} at ${clinicName}`,
        isVerified: true, // Auto-verified in live onboarding
      });

      // 2. Affiliate Doctor to Clinic Chamber
      const affiliation = await affiliationService.affiliateDoctor({
        clinicId: targetClinicId,
        doctorId: doctor.id,
        chamberNumber: data.chamberNumber || 'CH-1',
        consultationFeeRupees: data.consultationFeeRupees || 600,
        followUpFeeRupees: data.followUpFeeRupees ?? Math.round((data.consultationFeeRupees || 600) / 2),
        followUpValidityDays: data.followUpValidityDays || 14,
        isPrimaryClinic: true,
      });

      // 3. Register Dynamic User in AuthService & Issue JWT
      const cleanMobile = data.mobile.trim().replace(/^\+91/, '');
      authService.registerDynamicUser({
        userId,
        mobile: cleanMobile,
        fullName: data.fullName,
        email: data.email,
        activeRole: UserRole.DOCTOR,
        activeClinicId: targetClinicId,
        activeClinicName: clinicName,
        activeChamberNumber: data.chamberNumber || 'CH-1',
        allowedRoles: [UserRole.DOCTOR],
        availableClinics: [
          {
            clinicId: targetClinicId,
            clinicName,
            role: UserRole.DOCTOR,
            chamberNumber: data.chamberNumber || 'CH-1',
          },
        ],
      });

      const token = authService.signToken({
        sub: userId,
        mobile: cleanMobile,
        role: UserRole.DOCTOR,
        clinicId: targetClinicId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      });

      return reply.status(201).send({
        success: true,
        message: `Dr. ${doctor.fullName} provisioned with NMC verified chamber profile at ${clinicName}!`,
        doctor,
        affiliation,
        token,
        urls: {
          publicProfileUrl: `/dr/${doctor.slug}`,
          doctorPortalUrl: `/doctor`,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Doctor onboarding failed';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
      });
    }
  });

  /**
   * Chamber Schedule Conflict Detection: POST /api/v1/doctors/check-chamber-conflict
   * Automated verification to ensure no two doctors share a chamber simultaneously
   */
  fastify.post('/doctors/check-chamber-conflict', async (req, reply) => {
    const body = req.body as {
      clinicId?: string;
      chamberNumber: string;
      startTime?: string;
      endTime?: string;
    };

    if (!body || !body.chamberNumber) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'chamberNumber is required',
      });
    }

    try {
      const result = doctorService.checkChamberConflict({
        clinicId: body.clinicId,
        chamberNumber: body.chamberNumber,
        startTime: body.startTime,
        endTime: body.endTime,
      });
      return reply.status(200).send({
        success: true,
        ...result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to evaluate chamber conflict';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
      });
    }
  });

  /**
   * Public Doctor Directory Search: GET /api/v1/doctors
   */
  fastify.get('/doctors', async (req) => {
    const query = req.query as { specialty?: MedicalSpecialty; query?: string };
    const doctors = await doctorService.searchDoctors(query);

    const enriched = await Promise.all(
      doctors.map(async (doc) => {
        const affiliations = await affiliationService.getAffiliationsByDoctor(doc.id, true);
        const primaryAff = affiliations.find((a) => a.isPrimaryClinic) || affiliations[0];
        let primaryClinic;
        if (primaryAff) {
          primaryClinic = await clinicService.getClinicById(primaryAff.clinicId);
        }

        return {
          id: doc.id,
          fullName: doc.fullName,
          slug: doc.slug,
          specialties: doc.specialties,
          qualifications: doc.qualifications,
          experienceYears: doc.experienceYears,
          bio: doc.bio,
          profilePhotoUrl: doc.profilePhotoUrl,
          isVerified: doc.isVerified,
          primaryVenue: primaryAff
            ? {
                clinicId: primaryAff.clinicId,
                clinicName: primaryClinic?.clinic.name || SEED_DATA.clinic.name,
                locality: primaryClinic?.clinic.locality || SEED_DATA.clinic.locality,
                city: primaryClinic?.clinic.city || SEED_DATA.clinic.city,
                chamberNumber: primaryAff.chamberNumber,
                consultationFeeRupees: primaryAff.consultationFeeRupees,
              }
            : null,
          totalVenuesCount: affiliations.length,
        };
      })
    );

    return {
      success: true,
      count: enriched.length,
      doctors: enriched,
    };
  });

  /**
   * Public Doctor-First Discovery: GET /api/v1/doctors/:slug
   * Returns doctor credentials, specialties, and all affiliated clinics with chamber numbers and consultation fees
   */
  fastify.get('/doctors/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const doctor = await doctorService.getDoctorBySlug(slug);

    if (!doctor) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Doctor with slug "${slug}" was not found`,
      });
    }

    // Dynamically aggregate all active affiliations
    const affiliations = await affiliationService.getAffiliationsByDoctor(doctor.id, true);

    let consultingVenues = [];

    if (affiliations.length > 0) {
      consultingVenues = await Promise.all(
        affiliations.map(async (aff) => {
          const clinic = await clinicService.getClinicById(aff.clinicId);
          const sessions = await sessionService.getSessionsByDoctor(doctor.id, aff.clinicId, true);

          return {
            clinicId: aff.clinicId,
            clinicName: clinic?.clinic.name || SEED_DATA.clinic.name,
            locality: clinic?.clinic.locality || SEED_DATA.clinic.locality,
            city: clinic?.clinic.city || SEED_DATA.clinic.city,
            addressLine: clinic?.clinic.addressLine || SEED_DATA.clinic.addressLine,
            chamberNumber: aff.chamberNumber,
            consultationFeeRupees: aff.consultationFeeRupees,
            followUpFeeRupees: aff.followUpFeeRupees,
            followUpValidityDays: aff.followUpValidityDays,
            isPrimaryClinic: aff.isPrimaryClinic,
            sessions: sessions.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              sessionType: s.sessionType,
              startTime: s.startTime,
              endTime: s.endTime,
              slotDurationMinutes: s.slotDurationMinutes,
              maxTokens: s.maxWalkInTokens + s.maxOnlineSlots,
            })),
          };
        })
      );
    } else {
      // Fallback for mock/seed compatibility
      const seedDoc = SEED_DATA.doctors.find((d) => d.slug === slug);
      consultingVenues = [
        {
          clinicId: SEED_DATA.clinic.id,
          clinicName: SEED_DATA.clinic.name,
          locality: SEED_DATA.clinic.locality,
          city: SEED_DATA.clinic.city,
          addressLine: SEED_DATA.clinic.addressLine,
          chamberNumber: seedDoc ? seedDoc.chamberNumber : 'CH-1',
          consultationFeeRupees: seedDoc ? seedDoc.consultationFee : 500,
          followUpFeeRupees: seedDoc ? seedDoc.followUpFee : 300,
          followUpValidityDays: 7,
          isPrimaryClinic: true,
          sessions: seedDoc?.sessions || [],
        },
      ];
    }

    return {
      doctor,
      consultingVenues,
    };
  });

  /**
   * Public Doctor Verification Status Badge: GET /api/v1/public/doctors/:slug/verify-status
   */
  fastify.get('/public/doctors/:slug/verify-status', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const doctor = await doctorService.getDoctorBySlug(slug);

    if (!doctor) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Doctor with slug "${slug}" was not found`,
      });
    }

    return reply.status(200).send({
      slug: doctor.slug,
      fullName: doctor.fullName,
      registrationNumber: doctor.registrationNumber,
      stateMedicalCouncil: doctor.stateMedicalCouncil,
      isVerified: doctor.isVerified,
      verificationBadge: doctor.isVerified ? 'NMC_VERIFIED_PRACTITIONER' : 'VERIFICATION_PENDING',
    });
  });

  /**
   * Provision New Doctor Master Profile: POST /api/v1/admin/doctors
   * Restricted to SUPER_ADMIN or CLINIC_ADMIN
   */
  fastify.post(
    '/admin/doctors',
    {
      preHandler: [requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN] })],
    },
    async (req, reply) => {
      const parseResult = createDoctorSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const doctor = await doctorService.createDoctor(parseResult.data);
      return reply.status(201).send({
        success: true,
        message: `Doctor profile '${doctor.fullName}' created successfully. NMC verification pending.`,
        doctor,
      });
    }
  );

  /**
   * Get Doctor Profile by ID: GET /api/v1/admin/doctors/:doctorId
   */
  fastify.get(
    '/admin/doctors/:doctorId',
    {
      preHandler: [requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR] })],
    },
    async (req, reply) => {
      const { doctorId } = req.params as { doctorId: string };
      const doctor = await doctorService.getDoctorById(doctorId);

      if (!doctor) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Doctor with ID '${doctorId}' does not exist`,
        });
      }

      return reply.status(200).send({ success: true, doctor });
    }
  );

  /**
   * Super Admin NMC Verification Desk: PATCH /api/v1/admin/doctors/:doctorId/verify-nmc
   * Restricted strictly to SUPER_ADMIN role
   */
  fastify.patch(
    '/admin/doctors/:doctorId/verify-nmc',
    {
      preHandler: [requireAuth({ allowedRoles: [UserRole.SUPER_ADMIN] })],
    },
    async (req, reply) => {
      const { doctorId } = req.params as { doctorId: string };
      const parseResult = verifyNmcSchema.safeParse(req.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      try {
        const result = await doctorService.verifyNmcCredentials(
          doctorId,
          parseResult.data.isVerified,
          parseResult.data.auditNotes
        );

        return reply.status(200).send({
          success: true,
          message: `Doctor NMC verification set to ${parseResult.data.isVerified ? 'VERIFIED' : 'UNVERIFIED'}.`,
          ...result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update verification status';
        return reply.status(404).send({ error: 'Not Found', message });
      }
    }
  );

  /**
   * Doctor Self-Service Profile Update: PATCH /api/v1/doctor/profile
   * Restricted strictly to DOCTOR role
   */
  fastify.patch(
    '/doctor/profile',
    {
      preHandler: [requireAuth({ allowedRoles: [UserRole.DOCTOR] })],
    },
    async (req, reply) => {
      const parseResult = updateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      // Resolve doctor ID from authenticated tenant context
      const doctorId = req.tenant?.userId || SEED_DATA.doctors[0]!.doctorId;

      try {
        const updated = await doctorService.updateDoctorProfile(doctorId, parseResult.data);
        return reply.status(200).send({
          success: true,
          message: 'Doctor profile updated successfully',
          doctor: updated,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update doctor profile';
        return reply.status(404).send({ error: 'Not Found', message });
      }
    }
  );

  /**
   * 1-Click Delay Broadcast with Downstream ETA Recalculation: POST /api/v1/doctor/delay-broadcast
   */
  fastify.post(
    '/doctor/delay-broadcast',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST],
          requireClinic: true,
        }),
      ],
    },
    async (req, reply) => {
      const parseResult = delayBroadcastSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.format(),
        });
      }

      const user = req.tenant!;
      try {
        const result = await delayBroadcastEngine.broadcastDelay(parseResult.data, {
          userId: user.userId,
          role: user.activeRole,
          staffScope: user.staffScope,
          dedicatedDoctorId: user.dedicatedDoctorId,
        });

        return reply.status(200).send(result);
      } catch (err: any) {
        const msg = err.message || 'Delay broadcast failed';
        if (msg.includes('not found')) {
          return reply.status(404).send({ error: 'Not Found', message: msg });
        }
        if (msg.includes('Forbidden') || msg.includes('restricted')) {
          return reply.status(403).send({ error: 'Forbidden', message: msg });
        }
        return reply.status(400).send({ error: 'Bad Request', message: msg });
      }
    }
  );

  /**
   * Get Active Delay Status for a Doctor
   * GET /api/v1/doctor/delay-status
   */
  fastify.get(
    '/doctor/delay-status',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [
            UserRole.DOCTOR,
            UserRole.CLINIC_ADMIN,
            UserRole.RECEPTIONIST,
            UserRole.PATIENT,
            UserRole.SUPER_ADMIN,
          ],
        }),
      ],
    },
    async (req, reply) => {
      const { clinicId, doctorId } = req.query as { clinicId?: string; doctorId?: string };
      const resolvedClinicId = clinicId || req.tenant?.activeClinicId || SEED_DATA.clinic.id;
      const resolvedDoctorId =
        doctorId ||
        req.tenant?.dedicatedDoctorId ||
        req.tenant?.userId ||
        SEED_DATA.doctors[0]!.doctorId;

      const status = delayBroadcastEngine.getDelayStatus(resolvedClinicId, resolvedDoctorId);
      return reply.status(200).send({
        clinicId: resolvedClinicId,
        doctorId: resolvedDoctorId,
        isDelayActive: status?.isDelayActive || false,
        delayMinutes: status?.delayMinutes || 0,
        reasonMessage: status?.reasonMessage || 'Consultations running on time',
        status,
      });
    }
  );

  /**
   * Get Delay Broadcast Audit History
   * GET /api/v1/doctor/delay-history
   */
  fastify.get(
    '/doctor/delay-history',
    {
      preHandler: [
        requireAuth({
          allowedRoles: [UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.SUPER_ADMIN],
        }),
      ],
    },
    async (req, reply) => {
      const { clinicId, doctorId } = req.query as { clinicId?: string; doctorId?: string };
      const resolvedClinicId = clinicId || req.tenant?.activeClinicId || SEED_DATA.clinic.id;
      const history = delayBroadcastEngine.getDelayHistory(resolvedClinicId, doctorId);
      return reply.status(200).send({
        clinicId: resolvedClinicId,
        count: history.length,
        history,
      });
    }
  );
}
