import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/medibooking'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('medibooking-enterprise-jwt-secret-key-32charsmin'),
  CORS_ORIGIN: z.string().default('*'),
});

export const ENV = envSchema.parse(process.env);

