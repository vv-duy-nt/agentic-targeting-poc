export const ALLOWED_TABLES = [
  "customers",
  "products",
  "purchases",
  "customer_consents",
  "coupons",
] as const;

export const AGENT_EVENT_TYPES = [
  "request_received",
  "schema_loaded",
  "sql_generated",
  "sql_validated",
  "sql_executed",
  "product_selected",
  "asset_retrieved",
  "completed",
  "failed",
] as const;

export const DEFAULT_AGENT_LIMITS = {
  maxIterations: 10,
  maxQueryCount: 5,
  maxRows: 100,
  sqlTimeoutMs: 5_000,
} as const;
