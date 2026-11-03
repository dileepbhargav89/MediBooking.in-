/**
 * Phase 24: Server-Sent Events (SSE) Waiting Room TV Streaming Endpoint Test Suite
 * Validates SSE protocols, W3C standards, 15-second heartbeat, chamber filtering, and diagnostics.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RealtimeStreamManager } from '../src/services/realtime-sse';
import { PubSubBroker, MemoryPubSubDriver } from '../src/services/pubsub-broker';
import { createApiServer } from '../src/server';
import { SEED_DATA } from '@medibooking/database';

describe('Phase 24: Server-Sent Events (SSE) Waiting Room TV Streaming Endpoint', () => {
  beforeEach(() => {
    MemoryPubSubDriver.resetBus();
  });

  test('1. SSE connection delivers W3C compliant headers and initial snapshot', async () => {
    const broker = new PubSubBroker('tv-test-broker-1', true);
    const manager = new RealtimeStreamManager(broker, false);
    const clinicId = SEED_DATA.clinic.id;

    const headers: Record<string, string> = {};
    const chunks: string[] = [];
    const fakeReply: any = {
      raw: {
        setHeader: (key: string, val: string) => {
          headers[key.toLowerCase()] = val;
        },
        write: (chunk: string) => chunks.push(chunk),
        on: () => {},
      },
    };

    const clientId = manager.subscribe(clinicId, fakeReply);
    assert.ok(clientId.startsWith('client_'));

    // Check SSE headers
    assert.equal(headers['content-type'], 'text/event-stream');
    assert.equal(headers['cache-control'], 'no-cache, no-transform');
    assert.equal(headers['connection'], 'keep-alive');
    assert.equal(headers['x-accel-buffering'], 'no');

    // Check initial snapshot chunk
    assert.ok(chunks.length >= 1);
    const firstChunk = chunks[0]!;
    assert.ok(firstChunk.includes('event: snapshot'));
    assert.ok(firstChunk.includes(SEED_DATA.clinic.name));
    assert.ok(firstChunk.includes('CH-1'));
  });

  test('2. 15-second heartbeat pulses keepalive comments and heartbeat events to active TVs', async () => {
    const broker = new PubSubBroker('tv-test-broker-2', true);
    const manager = new RealtimeStreamManager(broker, false);
    const clinicId = SEED_DATA.clinic.id;

    const chunks: string[] = [];
    const fakeReply: any = {
      raw: {
        setHeader: () => {},
        write: (chunk: string) => chunks.push(chunk),
        on: () => {},
      },
    };

    manager.subscribe(clinicId, fakeReply);
    chunks.length = 0; // Clear snapshot

    // Trigger heartbeat pulse
    const pulsed = manager.pulseHeartbeat();
    assert.equal(pulsed, 1);

    // Verify both keepalive comment and heartbeat SSE event were written
    assert.ok(chunks.some((c) => c === ': keepalive\n\n'));
    assert.ok(chunks.some((c) => c.includes('event: heartbeat')));
  });

  test('3. Chamber-specific filtering scopes stream to designated doctor room', async () => {
    const broker = new PubSubBroker('tv-test-broker-3', true);
    const manager = new RealtimeStreamManager(broker, false);
    const clinicId = SEED_DATA.clinic.id;

    const chunksCH2: string[] = [];
    const fakeReplyCH2: any = {
      raw: {
        setHeader: () => {},
        write: (chunk: string) => chunksCH2.push(chunk),
        on: () => {},
      },
    };

    // TV outside Chamber 2 only wants Chamber 2 updates
    manager.subscribe(clinicId, fakeReplyCH2, { chamberFilter: 'CH-2' });

    // 1. Initial snapshot must only contain CH-2
    const initialSnapshot = chunksCH2[0]!;
    assert.ok(initialSnapshot.includes('CH-2'));
    assert.ok(!initialSnapshot.includes('CH-1'));
    chunksCH2.length = 0;

    // 2. Broadcast update to CH-1 -> CH-2 tablet must NOT receive it
    manager.broadcastChamberUpdate(clinicId, 'CH-1', { currentToken: 99 });
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(chunksCH2.length, 0, 'CH-2 stream must ignore CH-1 updates');

    // 3. Broadcast update to CH-2 -> CH-2 tablet DOES receive it
    manager.broadcastChamberUpdate(clinicId, 'CH-2', { currentToken: 55 });
    await new Promise((r) => setTimeout(r, 40));
    assert.ok(chunksCH2.some((c) => c.includes('55') && c.includes('CH-2')));
  });

  test('4. Diagnostic endpoint GET /api/v1/realtime/clinics/:clinicId/tv-status', async () => {
    const app = createApiServer();
    const clinicId = SEED_DATA.clinic.id;

    // Check status with no active screens
    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/clinics/${clinicId}/tv-status`,
    });

    assert.equal(statusRes.statusCode, 200);
    const status = JSON.parse(statusRes.payload);
    assert.equal(status.clinicId, clinicId);
    assert.ok(typeof status.activeScreensCount === 'number');
    assert.ok(status.currentSnapshot.clinicName);
    assert.ok(Array.isArray(status.connectedClients));

    await app.close();
  });

  test('5. Canonical /tv-stream endpoint alias validation', async () => {
    const app = createApiServer();

    // 1. Missing clinicId returns 400
    const missingRes = await app.inject({
      method: 'GET',
      url: '/api/v1/tv-stream',
    });
    assert.equal(missingRes.statusCode, 400);

    await app.close();
  });

  test('6. Disconnection handler automatically decrements active screen count', async () => {
    const broker = new PubSubBroker('tv-test-broker-6', true);
    const manager = new RealtimeStreamManager(broker, false);
    const clinicId = SEED_DATA.clinic.id;

    let closeHandler: (() => void) | null = null;
    const fakeReply: any = {
      raw: {
        setHeader: () => {},
        write: () => {},
        on: (event: string, handler: () => void) => {
          if (event === 'close') closeHandler = handler;
        },
      },
    };

    manager.subscribe(clinicId, fakeReply);
    assert.equal(manager.getTVStatus(clinicId).activeScreensCount, 1);

    // Simulate socket disconnect
    assert.ok(closeHandler);
    closeHandler!();

    assert.equal(manager.getTVStatus(clinicId).activeScreensCount, 0);
  });
});

