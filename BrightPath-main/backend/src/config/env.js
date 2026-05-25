/**
 * Environment validation (Zod).
 */

const { z } = require('zod');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend folder when cwd is backend/
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  FRONTEND_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  BCRYPT_ROUNDS: z.coerce.number().default(12),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .transform(v => v === 'true')
    .default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('BrightPath School <no-reply@brightpath.eg>'),

  VODAFONE_SMS_API_URL: z.string().optional().default(''),
  VODAFONE_SMS_USERNAME: z.string().optional(),
  VODAFONE_SMS_PASSWORD: z.string().optional(),
  VODAFONE_SMS_SENDER: z.string().default('BrightPath'),

  FAWRY_API_URL: z.string().optional().default(''),
  FAWRY_MERCHANT_CODE: z.string().optional(),
  FAWRY_SECURITY_KEY: z.string().optional(),
  FAWRY_SANDBOX: z
    .string()
    .transform(v => v === 'true')
    .default('true'),

  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_INTEGRATION_ID: z.string().optional(),
  PAYMOB_IFRAME_ID: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
  LOG_DIR: z.string().default('logs'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n');
  parsed.error.issues.forEach(issue => {
    console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

module.exports.env = parsed.data;
