/**
 * Passwordless Mobile OTP & Authentication Routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth-service';
import { UserRole } from '@medibooking/types';

const requestOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number starting with 6-9'),
});

const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number starting with 6-9'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  preferredRole: z.nativeEnum(UserRole).optional(),
});

const registerPatientSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number starting with 6-9'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  age: z.coerce.number().min(1, 'Age must be positive').max(125, 'Invalid age'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  email: z.string().email().optional().or(z.literal('')),
  locality: z.string().min(2, 'Locality is required'),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().optional(),
  dpdpConsent: z.boolean().default(true),
});

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * Request 6-Digit Passwordless OTP: POST /api/v1/auth/request-otp
   */
  fastify.post('/auth/request-otp', async (req, reply) => {
    const parseResult = requestOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    try {
      const result = await authService.requestOtp(parseResult.data.mobile);
      return reply.status(200).send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request OTP';
      const statusCode = message.includes('Rate limit') ? 429 : 400;
      return reply.status(statusCode).send({
        error: statusCode === 429 ? 'Too Many Requests' : 'Bad Request',
        message,
      });
    }
  });

  /**
   * Verify 6-Digit OTP & Issue JWT: POST /api/v1/auth/verify-otp
   */
  fastify.post('/auth/verify-otp', async (req, reply) => {
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    const { mobile, otp, preferredRole } = parseResult.data;

    try {
      const result = await authService.verifyOtp(mobile, otp, preferredRole);
      return reply.status(200).send({
        success: true,
        message: 'Authentication successful',
        ...result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      return reply.status(401).send({
        error: 'Unauthorized',
        message,
      });
    }
  });

  /**
   * Get Current Authenticated Profile: GET /api/v1/auth/me
   */
  fastify.get('/auth/me', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid Bearer authorization header',
      });
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);

    if (!payload) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Session token has expired or is invalid',
      });
    }

    const userContext = authService.resolveUserContext(payload.mobile, payload.role);

    return reply.status(200).send({
      success: true,
      user: userContext,
      tokenPayload: payload,
    });
  });

  /**
   * User / Patient Registration with Demographics & Profile: POST /api/v1/auth/register
   */
  fastify.post('/auth/register', async (req, reply) => {
    const parseResult = registerPatientSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    try {
      const result = await authService.registerPatient(parseResult.data);
      return reply.status(201).send({
        success: true,
        message: 'Patient profile registered successfully',
        ...result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return reply.status(400).send({
        error: 'Bad Request',
        message,
      });
    }
  });

  /**
   * Session Termination / Logout: POST /api/v1/auth/logout
   */
  fastify.post('/auth/logout', async (req, reply) => {
    return reply.status(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  });
}

