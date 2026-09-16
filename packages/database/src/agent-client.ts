import { Pool } from "pg";
import type { DatabaseConnectionConfig } from "./config.js";

/** All customer-facing agent SQL must use this pool's read-only DB role. */
export function createAgentPool(config: DatabaseConnectionConfig) {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.maxConnections,
    statement_timeout: config.statementTimeoutMs,
  });
}
