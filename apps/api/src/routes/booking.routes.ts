/**
 * MediBooking Online Patient Booking Routes
 * Fastify routes for atomic slot reservations and receipt lookups.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { appointmentService } from '../services/appointment-service';
import { clinicService } from '../services/clinic-service';
import { doctorService } from '../services/doctor-service';

const createBookingSchema = z.object({
  slotId: z.string().min(1, 'slotId is required'),
  sessionId: z.string().min(8, 'sessionId is required'),
  patientName: z.string().min(2, 'patientName must be at least 2 characters'),
  patientMobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  patientAge: z.number().int().min(0).max(120).optional(),
  patientGender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function bookingRoutes(fastify: FastifyInstance) {
  /**
   * Online Patient Slot Booking Transaction
   * POST /api/v1/public/bookings
   */
  fastify.post('/public/bookings', async (req, reply) => {
    const parseResult = createBookingSchema.safeParse(req.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    const data = parseResult.data;
    const headerIdempotencyKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string);
    const finalIdempotencyKey = data.idempotencyKey || headerIdempotencyKey;

    try {
      const { appointment, isReplay } = await appointmentService.createOnlineBooking({
        ...data,
        idempotencyKey: finalIdempotencyKey,
      });

      if (isReplay) {
        reply.header('Idempotent-Replay', 'true');
      }

      const clinicDetails = await clinicService.getClinicById(appointment.clinicId);
      const doctor = await doctorService.getDoctorById(appointment.doctorId);

      const status = isReplay ? 200 : 201;

      return reply.status(status).send({
        success: true,
        isReplay,
        appointment,
        summary: {
          bookingReference: appointment.receiptNumber,
          tokenNumber: appointment.tokenNumber,
          chamberNumber: appointment.chamberNumber,
          clinicName: clinicDetails?.clinic.name || 'Clinic',
          doctorName: doctor?.fullName || 'Doctor',
          appointmentDate: appointment.appointmentDate,
          estimatedTime: appointment.estimatedConsultTime,
          consultationFee: appointment.amountRupees,
          patientName: appointment.patientName,
          patientMobile: appointment.patientMobile,
        },
      });
    } catch (err: any) {
      const message = err.message || '';

      if (message.includes('SLOT_NOT_FOUND')) {
        return reply.status(404).send({
          error: 'Slot Not Found',
          message,
        });
      }

      if (
        message.includes('SLOT_ALREADY_BOOKED') ||
        message.includes('SLOT_BLOCKED') ||
        message.includes('LOCK_EXPIRED_OR_INVALID')
      ) {
        return reply.status(409).send({
          error: 'Booking Conflict',
          message,
        });
      }

      return reply.status(500).send({
        error: 'Internal Booking Error',
        message,
      });
    }
  });

  /**
   * Retrieve Booking Confirmation Details
   * GET /api/v1/public/bookings/:bookingId
   */
  fastify.get('/public/bookings/:bookingId', async (req, reply) => {
    const { bookingId } = req.params as { bookingId: string };
    const appointment = await appointmentService.getAppointmentById(bookingId);

    if (!appointment) {
      return reply.status(404).send({
        error: 'Booking Not Found',
        message: `Booking with ID '${bookingId}' was not found.`,
      });
    }

    const clinicDetails = await clinicService.getClinicById(appointment.clinicId);
    const doctor = await doctorService.getDoctorById(appointment.doctorId);

    return {
      appointment,
      summary: {
        bookingReference: appointment.receiptNumber,
        tokenNumber: appointment.tokenNumber,
        chamberNumber: appointment.chamberNumber,
        clinicName: clinicDetails?.clinic.name || 'Clinic',
        doctorName: doctor?.fullName || 'Doctor',
        appointmentDate: appointment.appointmentDate,
        estimatedTime: appointment.estimatedConsultTime,
        consultationFee: appointment.amountRupees,
        patientName: appointment.patientName,
        patientMobile: appointment.patientMobile,
      },
    };
  });
}
