import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { SaasBiService } from '../services/saas-bi-service';
import { cityService } from '../services/city-service';
import { CityLaunchStatus } from '@medibooking/types';

const createCitySchema = z.object({
  name: z.string().min(2, 'City name must be at least 2 characters'),
  slug: z.string().min(2).optional(),
  state: z.string().default('Madhya Pradesh'),
  stateCode: z.string().default('MP'),
  gstStateCode: z.string().default('23'),
  centerLat: z.number(),
  centerLng: z.number(),
  radiusKm: z.number().int().min(5).max(100).optional().default(25),
  regionalDialects: z.array(z.string()).optional(),
  launchStatus: z.nativeEnum(CityLaunchStatus).optional().default(CityLaunchStatus.PILOT_ACTIVE),
  initialLocalities: z.array(z.string()).min(1, 'Provide at least one initial locality'),
});

const updateCitySchema = z.object({
  launchStatus: z.nativeEnum(CityLaunchStatus).optional(),
  addLocalities: z.array(z.string()).optional(),
  radiusKm: z.number().int().min(5).max(100).optional(),
});

export const saasBiRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const saasBiService = SaasBiService.getInstance();

  // ==========================================
  // MULTI-CITY & MARKET PROVISIONING ROUTES
  // ==========================================

  // A. Get all active and provisioned cities with eager localities
  server.get('/saas/cities', async (_request, reply) => {
    const cities = cityService.getAllCities();
    return reply.send({
      success: true,
      count: cities.length,
      cities,
    });
  });

  // B. Reverse PIN-code resolver (Apollo / 1mg pattern)
  server.get('/saas/cities/resolve-pincode/:pincode', async (request, reply) => {
    const { pincode } = request.params as { pincode: string };
    const resolution = cityService.resolvePincode(pincode);
    return reply.send({
      success: true,
      resolution,
    });
  });

  // C. Super Admin Provision New City Cluster
  server.post('/saas/cities', async (request, reply) => {
    const parseResult = createCitySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    try {
      const newCity = cityService.createCity(parseResult.data);
      return reply.status(201).send({
        success: true,
        message: `City '${newCity.name}' provisioned successfully in ${newCity.launchStatus} stage.`,
        city: newCity,
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({
        error: statusCode === 409 ? 'City Slug Conflict' : 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // D. Super Admin Update City Status or add localities
  server.patch('/saas/cities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateCitySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.format(),
      });
    }

    try {
      const updatedCity = cityService.updateCity(id, parseResult.data);
      return reply.send({
        success: true,
        message: `City '${updatedCity.name}' updated successfully.`,
        city: updatedCity,
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({
        error: statusCode === 404 ? 'City Not Found' : 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // ==========================================
  // EXISTING SAAS BI & FINANCIAL ROUTES
  // ==========================================

  // 1. Network-wide aggregated OPD metrics across polyclinics
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
      message: 'HDFC/ICICI NEFT CMS batch payment executed successfully.',
      ...result,
    });
  });

  // 3b. Real-Time 24x7 Instant UPI Disbursal via RazorpayX / NPCI
  server.post('/saas/doctor-ledger/instant-upi-payout', async (request, reply) => {
    const body = (request.body as { recordId?: string }) || {};
    const result = saasBiService.disburseInstantUpi(body.recordId);
    return reply.send({
      message: 'Instant UPI Payout via RazorpayX executed successfully.',
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

