// lib/env-validation.ts
import { z } from 'zod';

/**
 * Server-side environment variable schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().url('Invalid MongoDB URI').describe('MongoDB connection string'),

  // Authentication
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters').describe('JWT signing secret'),
  JWT_EXPIRES_IN: z.string().default('7d').describe('JWT expiration time'),

  // Single user auth (optional for demo)
  SINGLE_USER: z.string().optional().describe('Single user username for demo'),
  SINGLE_PASSWORD: z.string().optional().describe('Single user password (plain text)'),
  SINGLE_PASSWORD_HASH: z.string().optional().describe('Single user password hash'),

  // Cloudinary
  CLOUDINARY_URL: z.string().url('Invalid Cloudinary URL').describe('Cloudinary configuration URL'),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().describe('Telegram bot token'),
  TELEGRAM_CHAT_ID: z.string().optional().describe('Telegram chat ID for notifications'),

  // Optional
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GOOGLE_SHEETS_API_KEY: z.string().optional().describe('Google Sheets API key'),
});

/**
 * Client-side environment variable schema
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional().describe('API base URL for client'),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional().describe('Analytics ID'),
});

type ServerEnv = z.infer<typeof envSchema>;
type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validate and return server environment variables
 */
export function validateServerEnv(): ServerEnv {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid server environment variables');
    }
    throw error;
  }
}

/**
 * Validate and return client environment variables
 */
export function validateClientEnv(): ClientEnv {
  try {
    return clientEnvSchema.parse({
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Client environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid client environment variables');
    }
    throw error;
  }
}

// Export validated env with lazy loading
let serverEnv: ServerEnv | null = null;
let clientEnv: ClientEnv | null = null;

/**
 * Get validated server environment (cached)
 */
export function getServerEnv(): ServerEnv {
  if (!serverEnv) {
    serverEnv = validateServerEnv();
  }
  return serverEnv;
}

/**
 * Get validated client environment (cached)
 */
export function getClientEnv(): ClientEnv {
  if (!clientEnv) {
    clientEnv = validateClientEnv();
  }
  return clientEnv;
}
