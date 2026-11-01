/**
 * MediBooking Enterprise Server-Sent Events (SSE) Real-time Stream
 * Ultra-low memory footprint (<25 MB on Android smart TVs and reception screens)
 */

import { FastifyReply } from 'fastify';
import { ClinicTVDisplayPayload, ChamberTVState, MedicalSpecialty } from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';

interface SSEClient {
  id: string;
  clinicId: string;
  reply: FastifyReply;
}

export class RealtimeStreamManager {
  private clients: Map<string, SSEClient> = new Map();

  // In-memory real-time state seeded with demo clinic
  private clinicStates: Map<string, ClinicTVDisplayPayload> = new Map();

  constructor() {
    this.initDefaultState();
  }

  private initDefaultState() {
    const defaultChambers: ChamberTVState[] = SEED_DATA.chambers.map((ch, idx) => {
      const doctor = SEED_DATA.doctors[idx] ?? SEED_DATA.doctors[0]!;
      return {
        chamberNumber: ch.chamberNumber,
        chamberName: ch.chamberName,
        doctorName: doctor.fullName,
        specialty: doctor.specialties[0] ?? MedicalSpecialty.GENERAL_MEDICINE,
        currentToken: idx === 0 ? 5 : idx === 1 ? 3 : null,
        servingPatientMaskedName: idx === 0 ? 'R*** Sharma' : idx === 1 ? 'A*** Khan' : null,
        upNextTokens: idx === 0 ? [6, 7, 8] : idx === 1 ? [4, 5] : [1, 2],
        delayMinutes: idx === 0 ? 15 : 0,
        statusMessage: idx === 0 ? 'Doctor delayed due to hospital rounds' : undefined,
      };
    });

    this.clinicStates.set(SEED_DATA.clinic.id, {
      clinicName: SEED_DATA.clinic.name,
      locality: SEED_DATA.clinic.locality,
      currentTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      chambers: defaultChambers,
    });
  }

  /**
   * Subscribe an HTTP connection to the clinic's real-time TV stream
   */
  public subscribe(clinicId: string, reply: FastifyReply): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    this.clients.set(clientId, { id: clientId, clinicId, reply });

    // Send initial snapshot
    const state = this.getClinicSnapshot(clinicId);
    reply.raw.write(`event: snapshot\ndata: ${JSON.stringify(state)}\n\n`);

    // Clean up on disconnect
    reply.raw.on('close', () => {
      this.clients.delete(clientId);
    });

    return clientId;
  }

  /**
   * Get latest snapshot for a clinic
   */
  public getClinicSnapshot(clinicId: string): ClinicTVDisplayPayload {
    return (
      this.clinicStates.get(clinicId) || {
        clinicName: 'Multi-Specialty Polyclinic',
        locality: 'Bhopal',
        currentTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        chambers: [],
      }
    );
  }

  /**
   * Broadcast chamber update (e.g. next patient called or consultation completed)
   */
  public broadcastChamberUpdate(clinicId: string, chamberNumber: string, update: Partial<ChamberTVState>) {
    const state = this.clinicStates.get(clinicId);
    if (!state) return;

    const chamber = state.chambers.find((c) => c.chamberNumber === chamberNumber);
    if (chamber) {
      Object.assign(chamber, update);
    }

    state.currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    this.emitToClinic(clinicId, 'chamber_update', { chamberNumber, ...update });
  }

  /**
   * Broadcast 1-click doctor delay notification to Waiting Room TV
   */
  public broadcastDoctorDelay(clinicId: string, doctorId: string, delayMinutes: number, reason: string) {
    const state = this.clinicStates.get(clinicId);
    if (!state) return;

    // Find chamber for doctor
    const doc = SEED_DATA.doctors.find((d) => d.doctorId === doctorId);
    const chamberNumber = doc ? doc.chamberNumber : 'CH-1';

    const chamber = state.chambers.find((c) => c.chamberNumber === chamberNumber);
    if (chamber) {
      chamber.delayMinutes = delayMinutes;
      chamber.statusMessage = `Doctor delayed by ~${delayMinutes} mins (${reason.replace(/_/g, ' ')})`;
    }

    this.emitToClinic(clinicId, 'delay_broadcast', {
      chamberNumber,
      delayMinutes,
      reason,
      statusMessage: chamber?.statusMessage,
    });
  }

  private emitToClinic(clinicId: string, event: string, payload: unknown) {
    const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients.values()) {
      if (client.clinicId === clinicId) {
        try {
          client.reply.raw.write(dataString);
        } catch {
          this.clients.delete(client.id);
        }
      }
    }
  }
}

export const realtimeStreamManager = new RealtimeStreamManager();

