import { ALLOWED_TABLES, DEFAULT_AGENT_LIMITS, type SqlValidationResult } from "@poc/shared";
import { parse } from "pgsql-ast-parser";

export type SqlValidationContext = { requireMarketingConsent?: boolean; maxRows?: number };

export function validateSql(sql: string, context: SqlValidationContext = {}): SqlValidationResult {
  const rules: SqlValidationResult["rules"] = [];
  const fail = (reason: string): SqlValidationResult => ({ valid: false, reason, rules });

  let statements: ReturnType<typeof parse>;
  try {
    statements = parse(sql);
  } catch {
    rules.push({ rule: "parseable", passed: false });
    return fail("SQL could not be parsed.");
  }

  rules.push({ rule: "single_statement", passed: statements.length === 1 });
  if (statements.length !== 1) return fail("Exactly one SQL statement is required.");

  if ((statements[0] as { type?: string }).type !== "select") {
    rules.push({ rule: "select_only", passed: false });
    return fail("Only SELECT queries are allowed.");
  }
  rules.push({ rule: "select_only", passed: true });

  if (/\b(?:pg_catalog|information_schema)\b/i.test(sql)) {
    rules.push({ rule: "system_schema", passed: false });
    return fail("System schemas are not allowed.");
  }

  const tables = [...sql.matchAll(/\b(?:from|join)\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)]
    .map((match) => match[1]!.toLowerCase());
  const unknownTable = tables.find((table) => !ALLOWED_TABLES.includes(table as typeof ALLOWED_TABLES[number]));
  rules.push({ rule: "table_whitelist", passed: !unknownTable });
  if (unknownTable) return fail(`Table ${unknownTable} is not allowed.`);

  const limit = Number(sql.match(/\blimit\s+(\d+)\b/i)?.[1]);
  const maxRows = context.maxRows ?? DEFAULT_AGENT_LIMITS.maxRows;
  rules.push({ rule: "limit", passed: Number.isInteger(limit) && limit > 0 && limit <= maxRows });
  if (!Number.isInteger(limit) || limit < 1 || limit > maxRows) return fail(`LIMIT must be between 1 and ${maxRows}.`);

  if (context.requireMarketingConsent ?? true) {
    const hasConsent = /\bmarketing_allowed\s*=\s*(?:true|1|'true')\b/i.test(sql);
    rules.push({ rule: "marketing_consent", passed: hasConsent });
    if (!hasConsent) return fail("Marketing consent condition is missing.");
  }

  return { valid: true, normalizedSql: sql.trim().replace(/;$/, ""), rules };
}
