import { z } from "zod";

export const databaseConnectionConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  maxConnections: z.number().int().positive().default(5),
  statementTimeoutMs: z.number().int().positive().default(5_000),
});

export type DatabaseConnectionConfig = z.infer<typeof databaseConnectionConfigSchema>;
