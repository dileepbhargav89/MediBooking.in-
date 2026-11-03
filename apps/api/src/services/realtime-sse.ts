/**
 * MediBooking Enterprise Server-Sent Events (SSE) Real-time Stream
 * Ultra-low memory footprint (<25 MB on Android smart TVs and reception screens)
 * Backed by Multi-Instance Redis Pub/Sub Event Backplane (Phase 23)
 * W3C Compliant with 15-second Keep-Alive Heartbeat and Chamber Filtering (Phase 24)
 */

import { FastifyReply } from 'fastify';
import {
  ClinicTVDisplayPayload,
  ChamberTVState,
  MedicalSpecialty,
  RealtimeClinicEvent,
  TVStreamOptions,
  TVStreamClientInfo,
  TVStatusResponse,
} from '@medibooking/types';
import { SEED_DATA } from '@medibooking/database';
import { pubsubBroker, PubSubBroker } from './pubsub-broker';

interface SSEClient {
  id: string;
  clinicId: string;
  connectedAt: string;
  chamberFilter?: string;
  ip?: string;
  reply: FastifyReply;
}

export class RealtimeStreamManager {
  private clients: Map<string, SSEClient> = new Map();
  private clinicStates: Map<string, ClinicTVDisplayPayload> = new Map();
  private brokerSubscriptions: Set<string> = new Set();
  private broker: PubSubBroker;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeatAt: string = new Date().toISOString();

  constructor(broker: PubSubBroker = pubsubBroker, startHeartbeat = true) {
    this.broker = broker;
    this.initDefaultState();
    // Pre-subscribe default seed clinic
    this.ensureBrokerSubscription(SEED_DATA.clinic.id);

    if (startHeartbeat) {
      this.startHeartbeatTimer(15000);
    }
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
   * Starts periodic 15-second heartbeat to defeat router/proxy timeouts
   */
  public startHeartbeatTimer(intervalMs = 15000) {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      this.pulseHeartbeat();
    }, intervalMs);

    // Ensure timer does not prevent process exit during tests
    this.heartbeatTimer.unref();
  }

  public stopHeartbeatTimer() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Pulses a 15-second keepalive comment and heartbeat event across all active TV sockets
   */
  public pulseHeartbeat(): number {
    this.lastHeartbeatAt = new Date().toISOString();
    let sentCount = 0;

    const deadClients: string[] = [];
    const pingChunk = `: keepalive\n\n`;
    const heartbeatEventChunk = `id: hb_${Date.now()}\nevent: heartbeat\ndata: ${JSON.stringify({ timestamp: this.lastHeartbeatAt, connectedScreens: this.clients.size })}\n\n`;

    for (const [id, client] of this.clients.entries()) {
      try {
        client.reply.raw.write(pingChunk);
        client.reply.raw.write(heartbeatEventChunk);
        sentCount++;
      } catch {
        deadClients.push(id);
      }
    }

    for (const deadId of deadClients) {
      this.clients.delete(deadId);
    }

    return sentCount;
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
      this.emitToLocalClients(clinicId, 'chamber_update', payload, data.chamberNumber);
    } else if (eventType === 'delay_broadcast') {
      const data = payload as { chamberNumber: string; delayMinutes: number; reason: string; statusMessage?: string };
      if (state && data.chamberNumber) {
        const chamber = state.chambers.find((c) => c.chamberNumber === data.chamberNumber);
        if (chamber) {
          chamber.delayMinutes = data.delayMinutes;
          chamber.statusMessage = data.statusMessage;
        }
      }
      this.emitToLocalClients(clinicId, 'delay_broadcast', payload, data.chamberNumber);
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
      this.emitToLocalClients(clinicId, 'session_cancelled', payload, data.chamberNumber);
    } else if (eventType === 'emergency_triage') {
      const data = payload as { chamberNumber: string; statusMessage?: string };
      if (state && data.chamberNumber) {
        const chamber = state.chambers.find((c) => c.chamberNumber === data.chamberNumber);
        if (chamber && data.statusMessage) {
          chamber.statusMessage = data.statusMessage;
        }
      }
      this.emitToLocalClients(clinicId, 'emergency_triage', payload, data.chamberNumber);
    } else if (eventType === 'heartbeat') {
      this.emitToLocalClients(clinicId, 'heartbeat', payload);
    } else if (eventType === 'queue_refresh') {
      this.emitToLocalClients(clinicId, 'queue_refresh', payload);
    }
  }

  /**
   * Subscribe an HTTP connection to the clinic's real-time TV stream
   * Supports chamber filtering and W3C event ID tagging
   */
  public subscribe(clinicId: string, reply: FastifyReply, options?: TVStreamOptions): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const client: SSEClient = {
      id: clientId,
      clinicId,
      connectedAt: now,
      chamberFilter: options?.chamberFilter,
      ip: reply.request?.ip || '127.0.0.1',
      reply,
    };

    this.clients.set(clientId, client);
    this.ensureBrokerSubscription(clinicId);

    // Send initial snapshot (filtered if chamberFilter is requested)
    const rawState = this.getClinicSnapshot(clinicId);
    let effectiveState = rawState;
    if (options?.chamberFilter) {
      effectiveState = {
        ...rawState,
        chambers: rawState.chambers.filter((c) => c.chamberNumber === options.chamberFilter),
      };
    }

    const snapshotId = `evt_snapshot_${Date.now()}`;
    reply.raw.write(`id: ${snapshotId}\nevent: snapshot\ndata: ${JSON.stringify(effectiveState)}\n\n`);

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
   * Direct emit to local connected SSE clients with optional chamber filtering
   */
  private emitToLocalClients(clinicId: string, event: string, payload: unknown, chamberNumber?: string) {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dataString = `id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const client of this.clients.values()) {
      if (client.clinicId === clinicId) {
        // If client is subscribed to a specific chamber, skip events for other chambers
        if (chamberNumber && client.chamberFilter && client.chamberFilter !== chamberNumber) {
          continue;
        }

        try {
          client.reply.raw.write(dataString);
        } catch {
          this.clients.delete(client.id);
        }
      }
    }
  }

  /**
   * Diagnostics: get active TV screens and health report
   */
  public getTVStatus(clinicId: string): TVStatusResponse {
    const connectedClients: TVStreamClientInfo[] = [];

    for (const client of this.clients.values()) {
      if (client.clinicId === clinicId) {
        connectedClients.push({
          id: client.id,
          clinicId: client.clinicId,
          connectedAt: client.connectedAt,
          chamberFilter: client.chamberFilter,
          ip: client.ip,
        });
      }
    }

    return {
      clinicId,
      activeScreensCount: connectedClients.length,
      connectedClients,
      lastHeartbeatAt: this.lastHeartbeatAt,
      currentSnapshot: this.getClinicSnapshot(clinicId),
    };
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
