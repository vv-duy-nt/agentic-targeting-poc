import { executeValidatedSql } from "@poc/database";
import { validateSql } from "@poc/sql-validator";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";

const bodySchema = z.object({ sql: z.string().trim().min(1).max(20_000) });

export async function sqlRoutes(app: FastifyInstance, agentPool: Pool) {
  app.post("/sql/validate", async (request) => {
    const { sql } = bodySchema.parse(request.body);
    return validateSql(sql, { requireMarketingConsent: true });
  });

  app.post("/sql/execute", async (request, reply) => {
    const { sql } = bodySchema.parse(request.body);
    const validation = validateSql(sql, { requireMarketingConsent: true });
    if (!validation.valid) return reply.code(400).send(validation);
    return { validation, ...(await executeValidatedSql(agentPool, validation)) };
  });
}
