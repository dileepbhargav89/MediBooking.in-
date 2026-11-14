import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SaasBiService } from '../services/saas-bi-service';

export const saasBiRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const saasBiService = SaasBiService.getInstance();

  // 1. Network-wide aggregated OPD metrics across Bhopal polyclinics
  server.get('/saas/network-metrics', async (_request, reply) => {
    const metrics = saasBiService.getNetworkMetrics();
    return reply.send({
      success: true,
      metrics,
    });
  });

  // 2. Doctor 80/20 Revenue Ledger and Section 194J TDS deductions
  server.get('/saas/doctor-ledger', async (_request, reply) => {
    const ledger = saasBiService.getDoctorLedger();
    return reply.send({
      success: true,
      count: ledger.length,
      ledger,
    });
  });

  // 3. Batch NEFT CMS Payout Disbursal with HDFC/ICICI encrypted file generation
  server.post('/saas/doctor-ledger/batch-disburse', async (_request, reply) => {
    const result = saasBiService.disburseBatchPayouts();
    return reply.send({
      success: true,
      message: 'HDFC/ICICI NEFT CMS batch payment executed successfully.',
      ...result,
    });
  });

  // 4. Chamber Idle Time Minimization Heatmap
  server.get('/saas/chamber-utilization', async (_request, reply) => {
    const heatmaps = saasBiService.getChamberUtilization();
    return reply.send({
      success: true,
      heatmaps,
    });
  });

  // 5. Section 194J Quarterly TDS Tax Report & Form 16A Generator
  server.get('/saas/tax/section-194j-report', async (_request, reply) => {
    const report = saasBiService.getSection194JReport();
    return reply.send({
      success: true,
      report,
    });
  });
};

