import { Pool } from "pg";
import type { DatabaseConnectionConfig } from "./config.js";

/** For bootstrap, migrations, seed and metadata only. Never import from agent code. */
export function createAdminPool(config: DatabaseConnectionConfig) {
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
