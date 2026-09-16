import type { Pool } from "pg";
import type { SqlValidationResult } from "@poc/shared";

export async function executeValidatedSql(pool: Pool, validation: SqlValidationResult) {
  if (!validation.valid || !validation.normalizedSql) throw new Error("Validated SQL is required.");
  const startedAt = performance.now();
  const result = await pool.query(validation.normalizedSql);
  return { rows: result.rows, rowCount: result.rowCount ?? 0, durationMs: Math.round(performance.now() - startedAt) };
}
