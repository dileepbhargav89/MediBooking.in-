import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { EMRService } from '../services/emr-service';

export const emrRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const emrService = EMRService.getInstance();

  // 1. Search Drug Formulations (sub-10ms generic/brand lookup)
  server.get<{ Querystring: { q?: string } }>(
    '/emr/drugs/search',
    async (request, reply) => {
      const { q } = request.query;
      const drugs = emrService.searchDrugs(q);
      return reply.send({
        success: true,
        query: q || '',
        count: drugs.length,
        drugs,
      });
    }
  );

  // 2. Get Clinical Protocol Bundles
  server.get('/emr/templates', async (_request, reply) => {
    const protocols = emrService.getProtocols();
    return reply.send({
      success: true,
      count: protocols.length,
      protocols,
    });
  });

  // 3. Get Consultation Queue with Reception-Recorded Vitals
  server.get('/emr/consultation-queue', async (_request, reply) => {
    const queue = emrService.getChamberQueue();
    return reply.send({
      success: true,
      chamberNumber: 'CH-3',
      doctorName: 'Dr. Rajesh Sharma',
      clinicName: 'Bhopal City Care Polyclinic',
      waitingCount: queue.filter((q) => q.status !== 'COMPLETED').length,
      queue,
    });
  });

  // 4. Save and Digitally Sign Prescription
  server.post<{ Body: any }>('/emr/prescriptions', async (request, reply) => {
    const payload = request.body || {};
    const prescription = emrService.createPrescription(payload);
    return reply.status(201).send({
      success: true,
      message: 'Prescription successfully signed with Doctor NMC Digital Hash.',
      prescription,
    });
  });

  // 5. Get Prescription By ID
  server.get<{ Params: { id: string } }>('/emr/prescriptions/:id', async (request, reply) => {
    const { id } = request.params;
    const prescription = emrService.getPrescriptionById(id);
    if (!prescription) {
      return reply.status(404).send({ success: false, error: 'Prescription not found' });
    }
    return reply.send({ success: true, prescription });
  });

  // 6. Dispatch Prescription to Patient WhatsApp
  server.post<{ Params: { id: string } }>(
    '/emr/prescriptions/:id/dispatch-whatsapp',
    async (request, reply) => {
      const { id } = request.params;
      const result = emrService.dispatchWhatsApp(id);
      return reply.send(result);
    }
  );

  // 7. Silent Print Trigger at Reception
  server.post<{ Params: { id: string } }>(
    '/emr/prescriptions/:id/print',
    async (request, reply) => {
      const { id } = request.params;
      const result = emrService.printPrescription(id);
      return reply.send(result);
    }
  );

  // 8. 1-Click Complete, Sign & Advance Chamber Queue
  server.post<{
    Body: {
      currentTokenNumber: number;
      nextTokenNumber?: number;
      autoSignPayload?: any;
    };
  }>('/emr/advance-queue', async (request, reply) => {
    const { currentTokenNumber, nextTokenNumber, autoSignPayload } = request.body || { currentTokenNumber: 12 };
    const result = emrService.advanceQueue(currentTokenNumber, nextTokenNumber, autoSignPayload);
    return reply.send(result);
  });

  // 9. Reset Queue to Initial State
  server.post('/emr/reset-queue', async (_request, reply) => {
    const queue = emrService.resetQueue();
    return reply.send({ success: true, message: 'Queue reset to initial state', queue });
  });

  // 10. Phase 15: Sub-15ms ICD-10 Semantic Search
  server.get<{ Querystring: { q?: string } }>('/emr/icd10/search', async (request, reply) => {
    const { q } = request.query;
    const results = emrService.searchIcd10(q);
    return reply.send({
      success: true,
      query: q || '',
      count: results.length,
      results,
    });
  });

  // 11. Phase 16: Inter-Chamber Referral Creation & Queue Intake
  server.post<{ Body: any }>('/emr/referrals', async (request, reply) => {
    const payload = request.body || {};
    const referral = emrService.createReferral(payload);
    return reply.status(201).send({
      success: true,
      message: 'Inter-chamber specialist referral successfully generated and routed to target queue.',
      referral,
    });
  });

  // 12. Phase 16: List Inter-Chamber Referrals
  server.get('/emr/referrals', async (_request, reply) => {
    const referrals = emrService.getReferrals();
    return reply.send({
      success: true,
      count: referrals.length,
      referrals,
    });
  });

  // 13. Phase 17: Multi-Language Regional Audio Synthesis for Prescriptions
  server.post<{ Body: any }>('/emr/prescriptions/synthesize-audio', async (request, reply) => {
    const payload = request.body || {};
    const audioResult = emrService.synthesizePrescriptionAudio(payload);
    return reply.send({
      success: true,
      ...audioResult,
    });
  });

  // 14. Phase 18: Smart Geriatric & Infant Priority Queue Escalation
  server.post<{
    Body: {
      tokenNumber: number;
      reason?: 'GERIATRIC_PRIORITY' | 'INFANT_FEVER_TRIAGE' | 'CHEST_PAIN_EMERGENCY';
    };
  }>('/emr/queue/escalate-priority', async (request, reply) => {
    const { tokenNumber, reason } = request.body || { tokenNumber: 15 };
    const result = emrService.escalatePriority(tokenNumber, reason);
    return reply.send(result);
  });

  // Phase 19: Offline-First Local Sync Engine Batch Ingestion
  server.post<{
    Body: {
      items: any[];
    };
  }>('/emr/sync/batch', async (request, reply) => {
    const { items } = request.body || { items: [] };
    const result = emrService.syncOfflineBatch(items);
    return reply.send(result);
  });

  // Phase 20: Real-Time Drug-Drug Interaction & Pediatric Dosing Safety Matrix
  server.post<{
    Body: {
      medications: Array<{ drugName: string; dosage?: string }>;
      patientAgeYears?: number;
      patientWeightKg?: number;
    };
  }>('/emr/safety/check-interactions', async (request, reply) => {
    const { medications, patientAgeYears, patientWeightKg } = request.body || { medications: [] };
    const result = emrService.checkMedicationSafety(medications, patientAgeYears, patientWeightKg);
    return reply.send({
      success: true,
      ...result,
    });
  });
};

