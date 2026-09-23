import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.url(),
  // Must match the "Verify Token" entered in the Meta App Dashboard (Webhooks product).
  META_VERIFY_TOKEN: z.string().min(16, 'must be at least 16 characters'),
  // Meta App Secret (App Dashboard > Settings > Basic). Used to verify X-Hub-Signature-256.
  META_APP_SECRET: z.string().min(1),
  // Long-lived Page access token with leads_retrieval. Used to fetch lead details.
  META_PAGE_ACCESS_TOKEN: z.string().min(1),
  // Pinned so a Meta release never changes response shapes under us.
  GRAPH_API_VERSION: z
    .string()
    .regex(/^vd+.d+$/, 'must look like v25.0')
    .default('v25.0'),
});

export type Config = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  databaseUrl: string;
  meta: {
    verifyToken: string;
    appSecret: string;
    pageAccessToken: string;
    graphApiVersion: string;
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
      appSecret: parsed.META_APP_SECRET,
      pageAccessToken: parsed.META_PAGE_ACCESS_TOKEN,
      graphApiVersion: parsed.GRAPH_API_VERSION,
    },
  };
}
