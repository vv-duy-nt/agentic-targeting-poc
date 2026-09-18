import { runTargetingAgent } from "@poc/agent";
import { createProvider } from "@poc/providers";
import { agentRunRequestSchema } from "@poc/shared";
import type { ToolRegistry } from "@poc/tools";
import type { Env } from "../config/env.js";
import type { FastifyInstance } from "fastify";

export async function agentRoutes(
  app: FastifyInstance,
  env: Env,
  tools: ToolRegistry,
) {
  app.post("/agent/run", async (request) => {
    const { prompt } = agentRunRequestSchema.parse(request.body);
    const provider = createProvider({
      provider: env.AI_PROVIDER,
      apiKey: env.AI_API_KEY,
      model: env.AI_MODEL,
      baseUrl: env.AI_BASE_URL,
    });

    return runTargetingAgent({
      provider,
      prompt,
      tools,
      limits: {
        maxIterations: env.AGENT_MAX_ITERATIONS,
        maxQueryCount: env.AGENT_MAX_QUERY_COUNT,
        maxRows: env.SQL_MAX_ROWS,
      },
    });
  });
}
