/**
 * Phase 48: Production Docker Containerization & Multi-Tenant Nginx Reverse Proxy Test Suite
 * Document ID: MB-SPEC-14 (Stage V, Phase 48)
 * Validates container builds, multi-stage isolation, security users, and Nginx SSE streaming configurations.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 48: Production Docker Containerization & Multi-Tenant Nginx Reverse Proxy', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  test('1. API Multi-Stage Dockerfile Security & Healthcheck Invariants', () => {
    const apiDockerfilePath = path.join(rootDir, 'apps/api/Dockerfile');
    assert.ok(fs.existsSync(apiDockerfilePath), 'apps/api/Dockerfile must exist');

    const content = fs.readFileSync(apiDockerfilePath, 'utf-8');

    // Multi-stage builder & runner
    assert.ok(content.includes('AS builder'), 'Must have builder stage');
    assert.ok(content.includes('AS runner'), 'Must have runner stage');

    // Security: Non-root execution
    assert.ok(content.includes('USER node'), 'Must execute as non-root user (node)');

    // Port and Healthcheck
    assert.ok(content.includes('EXPOSE 4000'), 'Must expose API port 4000');
    assert.ok(content.includes('HEALTHCHECK'), 'Must declare container healthcheck');
    assert.ok(content.includes('/health'), 'Healthcheck must query /health endpoint');
  });

  test('2. Web Next.js Multi-Stage Dockerfile Invariants', () => {
    const webDockerfilePath = path.join(rootDir, 'apps/web/Dockerfile');
    assert.ok(fs.existsSync(webDockerfilePath), 'apps/web/Dockerfile must exist');

    const content = fs.readFileSync(webDockerfilePath, 'utf-8');

    assert.ok(content.includes('AS builder'), 'Must have builder stage');
    assert.ok(content.includes('AS runner'), 'Must have runner stage');
    assert.ok(content.includes('USER node'), 'Must execute as non-root user');
    assert.ok(content.includes('EXPOSE 3000'), 'Must expose Web port 3000');
    assert.ok(content.includes('.next/standalone'), 'Must use Next.js standalone output');
  });

  test('3. Nginx Reverse Proxy: Smart TV SSE Unbuffered Streaming & Security Headers', () => {
    const nginxConfPath = path.join(rootDir, 'nginx/nginx.conf');
    assert.ok(fs.existsSync(nginxConfPath), 'nginx/nginx.conf must exist');

    const content = fs.readFileSync(nginxConfPath, 'utf-8');

    // Smart TV SSE Stream Optimization
    assert.ok(content.includes('/api/v1/realtime/'), 'Must define specialized SSE location');
    assert.ok(content.includes('proxy_buffering off;'), 'Must disable proxy buffering for SSE');
    assert.ok(content.includes('proxy_cache off;'), 'Must disable caching for SSE');
    assert.ok(content.includes('proxy_read_timeout 86400s;'), 'Must set 24-hour read timeout for TV display');

    // Multi-tenant domain handling
    assert.ok(content.includes('medibooking.in'), 'Must configure root domain');
    assert.ok(content.includes('*.medibooking.in'), 'Must configure wildcard clinic subdomains');

    // Rate Limiting Zones
    assert.ok(content.includes('limit_req_zone'), 'Must declare rate limiting zones');
    assert.ok(content.includes('zone=auth_limit'), 'Must enforce auth brute-force protection');

    // Hardened Security Headers
    assert.ok(content.includes('X-Frame-Options'), 'Must emit X-Frame-Options');
    assert.ok(content.includes('X-Content-Type-Options'), 'Must emit nosniff');
    assert.ok(content.includes('Strict-Transport-Security'), 'Must enforce HSTS');
  });

  test('4. Docker Compose Orchestration Topology', () => {
    const composePath = path.join(rootDir, 'docker-compose.yml');
    assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist');

    const content = fs.readFileSync(composePath, 'utf-8');

    // Required enterprise services
    const services = ['postgres:', 'redis:', 'api:', 'web:', 'nginx:'];
    for (const service of services) {
      assert.ok(content.includes(service), `docker-compose must declare service ${service}`);
    }

    // Persistent storage volumes
    assert.ok(content.includes('postgres_data:'), 'Must provision persistent postgres volume');
    assert.ok(content.includes('redis_data:'), 'Must provision persistent redis volume');

    // Healthchecks for core dependencies
    assert.ok(content.includes('pg_isready'), 'Postgres service must define pg_isready healthcheck');
    assert.ok(content.includes('redis-cli'), 'Redis service must define redis-cli ping healthcheck');

    // Network isolation
    assert.ok(content.includes('medibooking-network:'), 'Must define isolated bridge network');
  });

  test('5. Production Environment Template Completeness', () => {
    const envExamplePath = path.join(rootDir, '.env.production.example');
    assert.ok(fs.existsSync(envExamplePath), '.env.production.example must exist');

    const content = fs.readFileSync(envExamplePath, 'utf-8');
    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_ACCESS_TOKEN',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'BASE_DOMAIN',
    ];

    for (const v of requiredVars) {
      assert.ok(content.includes(v), `Production environment template must specify ${v}`);
    }
  });
});

