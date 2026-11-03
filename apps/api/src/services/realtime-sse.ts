/**
 * MediBooking Enterprise Server-Sent Events (SSE) Real-time Stream
 * Ultra-low memory footprint (<25 MB on Android smart TVs and reception screens)
 * Backed by Multi-Instance Redis Pub/Sub Event Backplane (Phase 23)
 */

import { FastifyReply } from 'fastify';
import {
  ClinicTVDisplayPayload,
  ChamberTVState,
  MedicalSpecialty,
  RealtimeClinicEvent,
} from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';
import { pubsubBroker, PubSubBroker } from './pubsub-broker';

interface SSEClient {
  id: string;
  clinicId: string;
  reply: FastifyReply;
}

export class RealtimeStreamManager {
  private clients: Map<string, SSEClient> = new Map();
  private clinicStates: Map<string, ClinicTVDisplayPayload> = new Map();
  private brokerSubscriptions: Set<string> = new Set();
  private broker: PubSubBroker;

  constructor(broker: PubSubBroker = pubsubBroker) {
    this.broker = broker;
    this.initDefaultState();
    // Pre-subscribe default seed clinic
    this.ensureBrokerSubscription(SEED_DATA.clinic.id);
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
   * Ensure this instance is listening to the Redis pub/sub channel for this clinic
   */
  public ensureBrokerSubscription(clinicId: string) {
    if (this.brokerSubscriptions.has(clinicId)) return;
    this.brokerSubscriptions.add(clinicId);

    this.broker.subscribeClinicEvents(clinicId, (event: RealtimeClinicEvent) => {
      this.handleRemoteClinicEvent(event);
    });
  }

  /**
   * Process event delivered across the Redis Pub/Sub backplane
   */
  private handleRemoteClinicEvent(event: RealtimeClinicEvent) {
    const { clinicId, eventType, payload } = event;
    const state = this.clinicStates.get(clinicId);

    if (eventType === 'chamber_update') {
      const data = payload as { chamberNumber: string } & Partial<ChamberTVState>;
      if (state && data.chamberNumber) {
        const chamber = state.chambers.find((c) => c.chamberNumber === data.chamberNumber);
        if (chamber) {
          Object.assign(chamber, data);
        }
        state.currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      }
      this.emitToLocalClients(clinicId, 'chamber_update', payload);
    } else if (eventType === 'delay_broadcast') {
      const data = payload as { chamberNumber: string; delayMinutes: number; reason: string; statusMessage?: string };
      if (state && data.chamberNumber) {
        const chamber = state.chambers.find((c) => c.chamberNumber === data.chamberNumber);
        if (chamber) {
          chamber.delayMinutes = data.delayMinutes;
          chamber.statusMessage = data.statusMessage;
        }
      }
      this.emitToLocalClients(clinicId, 'delay_broadcast', payload);
    } else if (eventType === 'session_cancelled') {
      const data = payload as { chamberNumber: string; statusMessage: string };
      if (state && data.chamberNumber) {
        const chamber = state.chambers.find((c) => c.chamberNumber === data.chamberNumber);
        if (chamber) {
          chamber.delayMinutes = 0;
          chamber.statusMessage = data.statusMessage;
          chamber.currentToken = null;
        }
      }
      this.emitToLocalClients(clinicId, 'session_cancelled', payload);
    } else if (eventType === 'emergency_triage') {
      const data = payload as { chamberNumber: string; statusMessage?: string };
      if (state && data.chamberNumber) {
        const chamber = state.chambers.find((c) => c.chamberNumber === data.chamberNumber);
        if (chamber && data.statusMessage) {
          chamber.statusMessage = data.statusMessage;
        }
      }
      this.emitToLocalClients(clinicId, 'emergency_triage', payload);
    } else if (eventType === 'heartbeat') {
      this.emitToLocalClients(clinicId, 'heartbeat', payload);
    } else if (eventType === 'queue_refresh') {
      this.emitToLocalClients(clinicId, 'queue_refresh', payload);
    }
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
    this.ensureBrokerSubscription(clinicId);

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

  public getSnapshot(clinicId: string): ClinicTVDisplayPayload {
    return this.getClinicSnapshot(clinicId);
  }

  /**
   * Broadcast chamber update (e.g. next patient called or consultation completed)
   * Publishes across Redis Pub/Sub backplane to reach all cluster instances.
   */
  public broadcastChamberUpdate(clinicId: string, chamberNumber: string, update: Partial<ChamberTVState>) {
    // 1. Immediately update local instance state for sub-millisecond local reads
    const state = this.clinicStates.get(clinicId);
    if (state) {
      const chamber = state.chambers.find((c) => c.chamberNumber === chamberNumber);
      if (chamber) {
        Object.assign(chamber, update);
      }
      state.currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    // 2. Publish event to Redis backplane
    this.broker.publishClinicEvent(clinicId, 'chamber_update', {
      chamberNumber,
      ...update,
    });
  }

  /**
   * Broadcast 1-click doctor delay notification to Waiting Room TV
   * Publishes across Redis Pub/Sub backplane to reach all cluster instances.
   */
  public broadcastDoctorDelay(clinicId: string, doctorId: string, delayMinutes: number, reason: string) {
    const state = this.clinicStates.get(clinicId);
    const doc = SEED_DATA.doctors.find((d) => d.doctorId === doctorId);
    const chamberNumber = doc ? doc.chamberNumber : 'CH-1';
    const statusMessage = `Doctor delayed by ~${delayMinutes} mins (${reason.replace(/_/g, ' ')})`;

    if (state) {
      const chamber = state.chambers.find((c) => c.chamberNumber === chamberNumber);
      if (chamber) {
        chamber.delayMinutes = delayMinutes;
        chamber.statusMessage = statusMessage;
      }
    }

    this.broker.publishClinicEvent(clinicId, 'delay_broadcast', {
      chamberNumber,
      delayMinutes,
      reason,
      statusMessage,
    });
  }

  /**
   * Broadcast emergency session cancellation to Waiting Room TV
   */
  public broadcastSessionCancelled(clinicId: string, chamberNumber: string, reason: string) {
    const statusMessage = `SESSION CANCELLED: ${reason}`;
    const state = this.clinicStates.get(clinicId);
    if (state) {
      const chamber = state.chambers.find((c) => c.chamberNumber === chamberNumber);
      if (chamber) {
        chamber.delayMinutes = 0;
        chamber.statusMessage = statusMessage;
        chamber.currentToken = null;
      }
    }

    this.broker.publishClinicEvent(clinicId, 'session_cancelled', {
      chamberNumber,
      statusMessage,
    });
  }

  /**
   * Broadcast heartbeat keep-alive
   */
  public broadcastHeartbeat(clinicId: string) {
    this.broker.publishClinicEvent(clinicId, 'heartbeat', {
      timestamp: new Date().toISOString(),
      activeClients: this.clients.size,
    });
  }

  /**
   * Direct emit to local connected SSE clients
   */
  private emitToLocalClients(clinicId: string, event: string, payload: unknown) {
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

  public getBroker(): PubSubBroker {
    return this.broker;
  }

  public getConnectedClientCount(clinicId?: string): number {
    if (!clinicId) return this.clients.size;
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.clinicId === clinicId) count++;
    }
    return count;
  }

  public resetClients(): void {
    this.clients.clear();
  }
}

export const realtimeStreamManager = new RealtimeStreamManager();
