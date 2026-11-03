import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/medibooking'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  JWT_SECRET: z.string().default('medibooking-enterprise-jwt-secret-key-32charsmin'),
  CORS_ORIGIN: z.string().default('*'),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v22.0'),
  SMS_GATEWAY_PROVIDER: z.string().default('SIMULATED'),
  SMS_DLT_SENDER_ID: z.string().default('MEDIBK'),
  SMS_DLT_ENTITY_ID: z.string().default('1101554433221100123'),
  SMS_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_TvOutO2qI4jaN0'),
  RAZORPAY_KEY_SECRET: z.string().default('w8WBkozXwQOSZtx7f15gcAC9'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('medibooking_whsec_dev'),
});

export const ENV = envSchema.parse(process.env);

