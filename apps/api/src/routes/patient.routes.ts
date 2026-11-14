/**
 * MediBooking Patient Family Profiles, Health Vault, and ABDM ABHA Routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { patientService } from '../services/patient-service';

const createFamilyMemberSchema = z.object({
  primaryMobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a 10-digit Indian mobile number'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  relationship: z.enum(['SELF', 'SPOUSE', 'PARENT', 'CHILD', 'OTHER']),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  age: z.number().int().min(0).max(120),
  dob: z.string().optional(),
  bloodGroup: z.string().optional(),
  chronicConditions: z.array(z.string()).optional(),
  knownAllergies: z.array(z.string()).optional(),
  abhaId: z.string().optional(),
  abhaAddress: z.string().optional(),
  dpdpConsentAcknowledged: z.boolean().optional(),
});

const generateAbhaOtpSchema = z.object({
  mobileOrAbha: z.string().min(10, 'Must be 10-digit mobile or 14-digit ABHA number'),
  authType: z.enum(['AADHAAR', 'MOBILE']).optional().default('AADHAAR'),
});

const verifyAbhaOtpSchema = z.object({
  txnId: z.string().min(3),
  otp: z.string().min(4).max(6),
  familyMemberId: z.string().optional(),
});

export async function patientRoutes(fastify: FastifyInstance) {
  /**
   * List Family Members for Primary Mobile: GET /api/v1/patient/family
   */
  fastify.get('/patient/family', async (req, reply) => {
    const query = req.query as { mobile?: string };
    const mobile = query.mobile || '9826011111'; // Default to Bhopal pilot caregiver

    try {
      const family = await patientService.getFamilyMembers(mobile);
      return reply.status(200).send({
        success: true,
        primaryMobile: mobile,
        familyCount: family.length,
        members: family,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve family members';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  /**
   * Add Dependent Family Member: POST /api/v1/patient/family
   */
  fastify.post('/patient/family', async (req, reply) => {
    const parseResult = createFamilyMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    try {
      const member = await patientService.addFamilyMember(parseResult.data);
      return reply.status(201).send({
        success: true,
        message: `${member.fullName} (${member.relationship}) added to family profiles successfully!`,
        member,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add family member';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  /**
   * Delete Dependent Family Member (DPDP Right to Erasure): DELETE /api/v1/patient/family/:id
   */
  fastify.delete('/patient/family/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const deleted = await patientService.deleteFamilyMember(id);
      return reply.status(200).send({
        success: deleted,
        message: deleted ? 'Family dependent erased under DPDP Act 2023' : 'Member not found',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete member';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  /**
   * Longitudinal Health Records & Prescriptions: GET /api/v1/patient/health-records
   */
  fastify.get('/patient/health-records', async (req, reply) => {
    const query = req.query as { mobile?: string; patientId?: string };
    const mobile = query.mobile || '9826011111';

    try {
      const records = await patientService.getHealthRecords({
        primaryMobile: mobile,
        patientId: query.patientId,
      });
      return reply.status(200).send({
        success: true,
        count: records.length,
        records,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch health records';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  /**
   * Initiate ABDM ABHA Milestone 1 OTP: POST /api/v1/abdm/abha/generate-otp
   */
  fastify.post('/abdm/abha/generate-otp', async (req, reply) => {
    const parseResult = generateAbhaOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    try {
      const result = await patientService.generateAbhaOtp(parseResult.data);
      return reply.status(200).send({
        success: true,
        ...result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate ABHA OTP';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  /**
   * Verify ABDM ABHA OTP & Link ID: POST /api/v1/abdm/abha/verify-otp
   */
  fastify.post('/abdm/abha/verify-otp', async (req, reply) => {
    const parseResult = verifyAbhaOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    try {
      const result = await patientService.verifyAbhaOtp(parseResult.data);
      return reply.status(200).send({
        success: true,
        ...result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to verify ABHA OTP';
      return reply.status(400).send({ error: 'Verification Error', message });
    }
  });
}

