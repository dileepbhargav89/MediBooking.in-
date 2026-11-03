import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('E2E Workflow 15 (Phase 56): Multi-AZ Container Deployment & CI/CD Pipeline', () => {
  test('15.1 GitHub Actions CI/CD Pipeline configuration validates workflow triggers and test jobs', async () => {
    const workflowPath = path.resolve(process.cwd(), '.github/workflows/e2e-playwright.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);

    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('MediBooking Enterprise CI/CD Pipeline');
    expect(workflowContent).toContain('branches: [main]');
    expect(workflowContent).toContain('npx playwright test');
    expect(workflowContent).toContain('setup-node@v4');
    expect(workflowContent).toContain('node-version: 20');
    expect(workflowContent).toContain('docker/build-push-action@v5');
  });

  test('15.2 Multi-AZ Docker Compose & Nginx configuration validates health checks and SSE buffering', async () => {
    const dockerComposePath = path.resolve(process.cwd(), 'docker-compose.yml');
    expect(fs.existsSync(dockerComposePath)).toBe(true);

    const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
    expect(dockerComposeContent).toContain('postgres:16-alpine');
    expect(dockerComposeContent).toContain('pg_isready');
    expect(dockerComposeContent).toContain('redis:7-alpine');
    expect(dockerComposeContent).toContain('nginx');

    const nginxPath = path.resolve(process.cwd(), 'nginx/nginx.conf');
    expect(fs.existsSync(nginxPath)).toBe(true);
    const nginxContent = fs.readFileSync(nginxPath, 'utf8');
    expect(nginxContent).toContain('proxy_buffering off');
    expect(nginxContent).toContain('proxy_http_version 1.1');
  });

  test('15.3 API Gateway Health Endpoint returns 200 OK with online multi-tenant polyclinic infrastructure', async ({ request }) => {
    const healthRes = await request.get('http://127.0.0.1:4000/health');
    expect(healthRes.status()).toBe(200);

    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe('ONLINE');
    expect(healthJson.service).toBe('MediBooking Enterprise API Gateway');
    expect(healthJson.chambersCount).toBe(4);
    expect(healthJson.doctorsCount).toBe(4);
  });
});
