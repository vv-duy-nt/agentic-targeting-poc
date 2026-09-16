import cors from "@fastify/cors";
import Fastify from "fastify";
import { createAdminPool, createAgentPool } from "@poc/database";
import type { Env } from "./config/env.js";
import { healthRoutes } from "./routes/health.js";
import { productRoutes } from "./routes/products.js";
import { schemaRoutes } from "./routes/schema.js";
import { sqlRoutes } from "./routes/sql.js";

export async function buildApp(env: Env) {
  const app = Fastify({ logger: true });
  const base = {
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    database: env.POSTGRES_DB,
    maxConnections: 5,
    statementTimeoutMs: env.SQL_TIMEOUT_MS,
  };
  const adminPool = createAdminPool({ ...base, user: env.POSTGRES_ADMIN_USER, password: env.POSTGRES_ADMIN_PASSWORD });
  const agentPool = createAgentPool({ ...base, user: env.POSTGRES_AGENT_USER, password: env.POSTGRES_AGENT_PASSWORD });

  await app.register(cors, { origin: true });
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(400).send({ error: error.name === "ZodError" ? "VALIDATION_ERROR" : "REQUEST_ERROR" });
  });
  await healthRoutes(app);
  await schemaRoutes(app, adminPool);
  await productRoutes(app, agentPool);
  await sqlRoutes(app, agentPool);
  app.addHook("onClose", async () => { await Promise.all([adminPool.end(), agentPool.end()]); });
  return app;
}
