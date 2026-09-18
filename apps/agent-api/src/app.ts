import cors from "@fastify/cors";
import Fastify from "fastify";
import { createAdminPool, createAgentPool } from "@poc/database";
import {
  ProviderConfigurationError,
  ProviderRequestError,
  ProviderResponseError,
} from "@poc/providers";
import { createStorageClient } from "@poc/storage";
import { createToolRegistry } from "@poc/tools";
import type { Env } from "./config/env.js";
import { agentRoutes } from "./routes/agent.js";
import { generateSqlRoutes } from "./routes/generate-sql.js";
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
  const storage = createStorageClient({
    endpoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    bucket: env.MINIO_BUCKET,
  });
  const tools = createToolRegistry({
    adminPool,
    agentPool,
    storage,
    maxRows: env.SQL_MAX_ROWS,
  });

  await app.register(cors, { origin: true });
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    if (error.name === "ZodError") {
      return reply.code(400).send({ error: "VALIDATION_ERROR" });
    }

    if (error instanceof ProviderConfigurationError) {
      return reply.code(400).send({ error: "AI_CONFIGURATION_ERROR" });
    }

    if (error instanceof ProviderResponseError) {
      return reply.code(422).send({ error: "AI_RESPONSE_ERROR" });
    }

    if (error instanceof ProviderRequestError) {
      return reply.code(502).send({ error: "AI_PROVIDER_ERROR" });
    }

    return reply.code(500).send({ error: "INTERNAL_ERROR" });
  });
  await healthRoutes(app);
  await schemaRoutes(app, adminPool);
  await productRoutes(app, agentPool);
  await sqlRoutes(app, agentPool);
  await generateSqlRoutes(app, env, adminPool);
  await agentRoutes(app, env, tools);
  app.addHook("onClose", async () => { await Promise.all([adminPool.end(), agentPool.end()]); });
  return app;
}
