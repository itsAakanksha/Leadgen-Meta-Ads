import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.url(),
  // Must match the "Verify Token" entered in the Meta App Dashboard (Webhooks product).
  META_VERIFY_TOKEN: z.string().min(16, 'must be at least 16 characters'),
});

export type Config = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  databaseUrl: string;
  meta: {
    verifyToken: string;
  };
};

/** The only place that reads process.env. Fails fast with every invalid variable listed. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    // Report variable names and problems only, never the values (they may be secrets).
    const problems = result.error.issues.map(
      (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  const parsed = result.data;
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    databaseUrl: parsed.DATABASE_URL,
    meta: {
      verifyToken: parsed.META_VERIFY_TOKEN,
    },
  };
}
