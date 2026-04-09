import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  DATABASE_URL: z.string().url().default("postgres://chat:chat@localhost:5432/chat"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(32).default("dev-access-secret-change-in-production-32b"),
  JWT_REFRESH_PEPPER: z.string().min(32).default("dev-refresh-pepper-change-in-production-x"),
  ACCESS_TTL: z.coerce.number().int().default(900),
  REFRESH_TTL: z.coerce.number().int().default(2592000),

  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform(s => s.split(",").map(o => o.trim())),

  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().default(10),
  RATE_LIMIT_LOGIN_WINDOW: z.coerce.number().int().default(60),
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().default(5),
  RATE_LIMIT_REGISTER_WINDOW: z.coerce.number().int().default(60),
  RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().default(30),
  RATE_LIMIT_REFRESH_WINDOW: z.coerce.number().int().default(60),
  RATE_LIMIT_DEFAULT_MAX: z.coerce.number().int().default(120),
  RATE_LIMIT_DEFAULT_WINDOW: z.coerce.number().int().default(60),

  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET: z.string().default("chat-attachments"),
  S3_PUBLIC_URL: z.string().url().default("http://localhost:9000/chat-attachments"),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  EMAIL_FROM: z.string().email().default("no-reply@chat.local"),
  EMAIL_VERIFY_URL_BASE: z.string().url().default("http://localhost:5173/verify"),
  EMAIL_RESET_URL_BASE: z.string().url().default("http://localhost:5173/reset"),

  WS_HEARTBEAT_INTERVAL: z.coerce.number().int().default(20),
  WS_PRESENCE_TTL: z.coerce.number().int().default(60),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const data = result.data;
  if (data.NODE_ENV === "production") {
    if (data.JWT_ACCESS_SECRET === "dev-access-secret-change-in-production-32b") {
      console.error("FATAL: JWT_ACCESS_SECRET must be set in production");
      process.exit(1);
    }
    if (data.JWT_REFRESH_PEPPER === "dev-refresh-pepper-change-in-production-x") {
      console.error("FATAL: JWT_REFRESH_PEPPER must be set in production");
      process.exit(1);
    }
  }

  return data;
}

export const env = loadEnv();
