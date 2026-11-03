/**
 * Phase 23: Multi-Instance Redis Pub/Sub Event Backplane Test Suite
 * Validates cross-instance real-time fanout, channel isolation, SSE synchronization, and telemetry.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PubSubBroker, MemoryPubSubDriver } from '../src/services/pubsub-broker';
import { RealtimeStreamManager } from '../src/services/realtime-sse';
import { createApiServer } from '../src/server';
import { SEED_DATA } from '@medibooking/database';
import { RealtimeClinicEvent } from '@medibooking/types';

describe('Phase 23: Multi-Instance Redis Pub/Sub Event Backplane', () => {
  beforeEach(() => {
    MemoryPubSubDriver.resetBus();
  });

  test('1. Multi-instance simulated broadcasting across independent broker nodes', async () => {
    const brokerNodeA = new PubSubBroker('instance-node-A', true);
    const brokerNodeB = new PubSubBroker('instance-node-B', true);
    const brokerNodeC = new PubSubBroker('instance-node-C', true);

    const clinicId = 'c1010000-0000-4000-8000-000000000001';

    const receivedA: RealtimeClinicEvent[] = [];
    const receivedB: RealtimeClinicEvent[] = [];

    await brokerNodeA.subscribeClinicEvents(clinicId, (evt) => {
      receivedA.push(evt);
    });

    await brokerNodeB.subscribeClinicEvents(clinicId, (evt) => {
      receivedB.push(evt);
    });

    // Node C publishes an event
    const published = await brokerNodeC.publishClinicEvent(clinicId, 'chamber_update', {
      chamberNumber: 'CH-2',
      currentToken: 14,
      servingPatientMaskedName: 'P*** Verma',
    });

    // Wait for microtask async queue
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(receivedA.length, 1);
    assert.equal(receivedB.length, 1);

    assert.equal(receivedA[0]?.eventId, published.eventId);
    assert.equal(receivedA[0]?.senderInstanceId, 'instance-node-C');
    assert.equal((receivedA[0]?.payload as any).currentToken, 14);

    assert.equal(receivedB[0]?.eventId, published.eventId);
    assert.equal(receivedB[0]?.senderInstanceId, 'instance-node-C');
  });

  test('2. Multi-tenant channel isolation prevents cross-clinic event leakage', async () => {
    const brokerClinic1 = new PubSubBroker('node-clinic-1', true);
    const brokerClinic2 = new PubSubBroker('node-clinic-2', true);
    const publisher = new PubSubBroker('node-publisher', true);

    const clinicId1 = 'c1010000-0000-4000-8000-000000000001';
    const clinicId2 = 'c2020000-0000-4000-8000-000000000002';

    const events1: RealtimeClinicEvent[] = [];
    const events2: RealtimeClinicEvent[] = [];

    await brokerClinic1.subscribeClinicEvents(clinicId1, (evt) => events1.push(evt));
    await brokerClinic2.subscribeClinicEvents(clinicId2, (evt) => events2.push(evt));

    // Publish to Clinic 1 only
    await publisher.publishClinicEvent(clinicId1, 'delay_broadcast', {
      chamberNumber: 'CH-1',
      delayMinutes: 25,
      reason: 'TRAFFIC',
    });

    await new Promise((r) => setTimeout(r, 50));

    assert.equal(events1.length, 1, 'Clinic 1 subscriber should receive the event');
    assert.equal(events2.length, 0, 'Clinic 2 subscriber must NOT receive Clinic 1 events');
  });

  test('3. RealtimeStreamManager multi-node SSE synchronization', async () => {
    const brokerNode1 = new PubSubBroker('fastify-node-1', true);
    const brokerNode2 = new PubSubBroker('fastify-node-2', true);

    const managerNode1 = new RealtimeStreamManager(brokerNode1);
    const managerNode2 = new RealtimeStreamManager(brokerNode2);

    const clinicId = SEED_DATA.clinic.id;

    // Simulate an SSE client connected to Node 2 (e.g. Smart TV in reception)
    const sseChunks: string[] = [];
    const fakeReply: any = {
      raw: {
        setHeader: () => {},
        write: (chunk: string) => sseChunks.push(chunk),
        on: () => {},
      },
    };

    managerNode2.subscribe(clinicId, fakeReply);
    assert.ok(sseChunks.length > 0, 'Should send initial snapshot upon subscription');
    sseChunks.length = 0; // Clear snapshot

    // Doctor calls next patient on Node 1
    managerNode1.broadcastChamberUpdate(clinicId, 'CH-1', {
      currentToken: 42,
      servingPatientMaskedName: 'D*** Bhargav',
    });

    await new Promise((r) => setTimeout(r, 60));

    // Check Node 2's snapshot was updated via PubSub
    const snapshotNode2 = managerNode2.getSnapshot(clinicId);
    const ch1 = snapshotNode2.chambers.find((c) => c.chamberNumber === 'CH-1');
    assert.equal(ch1?.currentToken, 42);
    assert.equal(ch1?.servingPatientMaskedName, 'D*** Bhargav');

    // Check Node 2 transmitted the SSE event to its connected TV client
    assert.ok(sseChunks.some((chunk) => chunk.includes('event: chamber_update') && chunk.includes('42')));
  });

  test('4. REST API: POST /api/v1/realtime/publish and GET /api/v1/realtime/stats', async () => {
    const app = createApiServer();

    // 1. Check stats endpoint
    const statsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/realtime/stats',
    });
    assert.equal(statsRes.statusCode, 200);
    const stats = JSON.parse(statsRes.payload);
    assert.ok(stats.instanceId);
    assert.equal(stats.driver, 'memory');
    assert.ok(typeof stats.totalPublished === 'number');

    // 2. Publish real-time event via REST
    const clinicId = 'c1010000-0000-4000-8000-000000000001';
    const pubRes = await app.inject({
      method: 'POST',
      url: '/api/v1/realtime/publish',
      payload: {
        clinicId,
        eventType: 'delay_broadcast',
        payload: {
          chamberNumber: 'CH-3',
          delayMinutes: 20,
          reason: 'EMERGENCY_OT',
        },
      },
    });

    assert.equal(pubRes.statusCode, 200);
    const pubBody = JSON.parse(pubRes.payload);
    assert.equal(pubBody.success, true);
    assert.equal(pubBody.event.clinicId, clinicId);
    assert.equal(pubBody.event.eventType, 'delay_broadcast');

    // 3. Heartbeat REST endpoint
    const hbRes = await app.inject({
      method: 'POST',
      url: `/api/v1/realtime/clinics/${clinicId}/heartbeat`,
    });
    assert.equal(hbRes.statusCode, 200);

    // 4. Reject invalid event type
    const invalidRes = await app.inject({
      method: 'POST',
      url: '/api/v1/realtime/publish',
      payload: {
        clinicId,
        eventType: 'unsupported_event',
        payload: {},
      },
    });
    assert.equal(invalidRes.statusCode, 400);

    await app.close();
  });

  test('5. Unsubscribe cleanly removes listener and unbinds channel', async () => {
    const broker = new PubSubBroker('node-unsub-test', true);
    const clinicId = 'c3030000-0000-4000-8000-000000000003';

    let received = 0;
    const unsubscribe = await broker.subscribeClinicEvents(clinicId, () => {
      received++;
    });

    const statsBefore = broker.getStats();
    assert.ok(statsBefore.activeChannels.includes(`clinic:${clinicId}:realtime`));

    await broker.publishClinicEvent(clinicId, 'heartbeat', {});
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(received, 1);

    // Unsubscribe
    unsubscribe();

    const statsAfter = broker.getStats();
    assert.ok(!statsAfter.activeChannels.includes(`clinic:${clinicId}:realtime`));

    await broker.publishClinicEvent(clinicId, 'heartbeat', {});
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(received, 1, 'Should not receive event after unsubscribe');
  });
});
