import { z } from "zod";

const schema = z.object({
  API_PORT: z.coerce.number().default(3001),
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.coerce.number(),
  POSTGRES_DB: z.string(),
  POSTGRES_ADMIN_USER: z.string(),
  POSTGRES_ADMIN_PASSWORD: z.string(),
  POSTGRES_AGENT_USER: z.string(),
  POSTGRES_AGENT_PASSWORD: z.string(),
  SQL_TIMEOUT_MS: z.coerce.number().default(5_000),
  SQL_MAX_ROWS: z.coerce.number().int().min(1).max(100).default(100),
  AGENT_MAX_ITERATIONS: z.coerce.number().int().min(1).max(10).default(10),
  AGENT_MAX_QUERY_COUNT: z.coerce.number().int().min(1).max(5).default(5),
  MINIO_ENDPOINT: z.string().trim().min(1),
  MINIO_PORT: z.coerce.number().int().positive(),
  MINIO_USE_SSL: z.preprocess(
    (value) => value === "true",
    z.boolean().default(false),
  ),
  MINIO_ACCESS_KEY: z.string().trim().min(1),
  MINIO_SECRET_KEY: z.string().trim().min(1),
  MINIO_BUCKET: z.string().trim().min(1),
  AI_PROVIDER: z.string().trim().default("gemini"),
  AI_API_KEY: z.string().trim().min(1).optional(),
  AI_MODEL: z.string().trim().min(1).default("gemini-3.6-flash"),
  AI_BASE_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url().optional(),
  ),
});

export type Env = z.infer<typeof schema>;

export const loadEnv = () => schema.parse(process.env);
