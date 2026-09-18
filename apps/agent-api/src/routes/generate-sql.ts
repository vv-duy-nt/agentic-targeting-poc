import { generateSqlFromNaturalLanguage } from "@poc/agent";
import { getDatabaseSchema } from "@poc/database";
import { createProvider } from "@poc/providers";
import type { Env } from "../config/env.js";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
});

export async function generateSqlRoutes(
  app: FastifyInstance,
  env: Env,
  adminPool: Pool,
) {
  app.post("/sql/generate", async (request) => {
    const { prompt } = bodySchema.parse(request.body);
    const provider = createProvider({
      provider: env.AI_PROVIDER,
      apiKey: env.AI_API_KEY,
      model: env.AI_MODEL,
      baseUrl: env.AI_BASE_URL,
    });
    const schema = await getDatabaseSchema(adminPool);

    return generateSqlFromNaturalLanguage({
      provider,
      prompt,
      schema,
    });
  });
}
