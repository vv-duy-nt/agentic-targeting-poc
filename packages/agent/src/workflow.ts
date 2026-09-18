import { randomUUID } from "node:crypto";
import type { LLMProvider } from "@poc/providers";
import {
  DEFAULT_AGENT_LIMITS,
  type AgentEvent,
  type AgentRunResult,
  type CustomerSegmentItem,
  type Product,
  type SqlGeneration,
} from "@poc/shared";
import {
  createToolRegistry,
  type ToolRegistryDependencies,
} from "@poc/tools";
import { generateSqlFromNaturalLanguage } from "./sql-generation.js";

type ToolRegistry = ReturnType<typeof createToolRegistry>;

export type RunTargetingAgentInput = {
  provider: LLMProvider;
  prompt: string;
  tools: ToolRegistry;
  limits?: {
    maxIterations?: number;
    maxQueryCount?: number;
    maxRows?: number;
  };
};

export async function runTargetingAgent(
  input: RunTargetingAgentInput,
): Promise<AgentRunResult> {
  const executionId = randomUUID();
  const trace: AgentEvent[] = [];
  const limits = {
    maxIterations:
      input.limits?.maxIterations ?? DEFAULT_AGENT_LIMITS.maxIterations,
    maxQueryCount:
      input.limits?.maxQueryCount ?? DEFAULT_AGENT_LIMITS.maxQueryCount,
    maxRows: input.limits?.maxRows ?? DEFAULT_AGENT_LIMITS.maxRows,
  };

  addTrace(trace, "request_received", "running", "Received targeting request.", {
    maxIterations: limits.maxIterations,
    maxQueryCount: limits.maxQueryCount,
    maxRows: limits.maxRows,
  });

  const schema = await input.tools.get_database_schema.execute({});
  addTrace(trace, "schema_loaded", "success", "Loaded allowlisted database schema.", {
    tableCount: schema.length,
  });

  const { generation } = await generateSqlFromNaturalLanguage({
    provider: input.provider,
    prompt: input.prompt,
    schema,
    maxRows: limits.maxRows,
  });

  addTrace(trace, "sql_generated", "success", "Generated structured SQL response.", {
    intent: generation.intent,
    language: generation.language,
    tableCount: generation.tablesUsed.length,
  });

  if (generation.intent === "unsupported" || generation.sql === null) {
    addTrace(trace, "completed", "success", "Request is outside the available data scope.");
    return {
      executionId,
      request: input.prompt,
      trace,
    };
  }

  const validation = await input.tools.validate_sql.execute({
    sql: generation.sql,
  });
  addTrace(
    trace,
    "sql_validated",
    validation.valid ? "success" : "failed",
    validation.valid ? "SQL validation passed." : "SQL validation failed.",
    { rulesPassed: validation.rules.filter((rule) => rule.passed).length },
  );

  if (!validation.valid) {
    addTrace(trace, "failed", "failed", "Stopped before SQL execution.");
    return {
      executionId,
      request: input.prompt,
      sql: generation.sql,
      validation,
      trace,
      errorCode: "SQL_VALIDATION_FAILED",
    };
  }

  if (limits.maxQueryCount < 1) {
    addTrace(trace, "failed", "failed", "Query limit prevents SQL execution.");
    return {
      executionId,
      request: input.prompt,
      sql: generation.sql,
      validation,
      trace,
      errorCode: "QUERY_LIMIT_REACHED",
    };
  }

  const execution = await input.tools.execute_sql.execute({
    sql: generation.sql,
  });
  addTrace(trace, "sql_executed", "success", "Executed validated SQL with agent_reader.", {
    durationMs: execution.durationMs,
    rowCount: execution.rowCount,
  });

  const segment = {
    count: execution.rowCount,
    customers: toCustomerSegment(execution.rows),
  };

  const recommendation = await recommendProduct(
    input.tools,
    input.prompt,
    generation,
  );

  if (recommendation.product) {
    addTrace(trace, "product_selected", "success", "Selected an active product.", {
      productId: recommendation.product.id,
      category: recommendation.product.category,
    });
  }

  if (recommendation.imageUrl) {
    addTrace(trace, "asset_retrieved", "success", "Resolved product image URL.");
  }

  addTrace(trace, "completed", "success", "Targeting workflow completed.");

  return {
    executionId,
    request: input.prompt,
    sql: generation.sql,
    validation,
    segment,
    product: recommendation.product,
    imageUrl: recommendation.imageUrl,
    trace,
  };
}

async function recommendProduct(
  tools: ToolRegistry,
  prompt: string,
  generation: SqlGeneration,
): Promise<{ product?: Product & { reason: string }; imageUrl?: string }> {
  const category = deriveCategory(prompt, generation.sql ?? "");

  if (!category) {
    return {};
  }

  const products = await tools.find_products.execute({
    category,
    active: true,
    limit: 1,
  });
  const selected = products[0];

  if (!selected) {
    return {};
  }

  const image = await tools.get_product_image.execute({ productId: selected.id });

  return {
    product: {
      ...selected,
      reason: productReason(generation.language, category),
    },
    imageUrl: image.imageUrl,
  };
}

function deriveCategory(prompt: string, sql: string): string | undefined {
  const sqlCategory = sql.match(
    /(?:\blower\s*\()?\b(?:pr\.)?category\)?\s*=\s*'([^']+)'/i,
  )?.[1];

  if (sqlCategory) {
    return sqlCategory.toLowerCase();
  }

  const normalized = prompt.toLocaleLowerCase();
  const categories: Record<string, string[]> = {
    electronics: ["electronics", "điện tử", "エレクトロニクス", "電子"],
    beauty: ["beauty", "mỹ phẩm", "美容"],
    fashion: ["fashion", "thời trang", "ファッション"],
    food: ["food", "thực phẩm", "đồ ăn", "食品"],
    home: ["home", "gia dụng", "nhà cửa", "ホーム"],
  };

  return Object.entries(categories).find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  )?.[0];
}

function toCustomerSegment(rows: Record<string, unknown>[]): CustomerSegmentItem[] {
  return rows.flatMap((row) => {
    const id = Number(row.id);
    const name = typeof row.name === "string" ? row.name : undefined;
    const city = typeof row.city === "string" ? row.city : undefined;

    if (!Number.isInteger(id) || id < 1 || !name || !city) {
      return [];
    }

    const customer: CustomerSegmentItem = { id, name, city };

    if (typeof row.email === "string" && row.email.includes("@")) {
      customer.email = row.email;
    }

    const totalSpent = Number(row.total_spent);
    if (Number.isFinite(totalSpent) && totalSpent >= 0) {
      customer.totalSpent = totalSpent;
    }

    return [customer];
  });
}

function productReason(language: SqlGeneration["language"], category: string): string {
  const messages = {
    vi: `Sản phẩm đang active thuộc danh mục ${category} mà segment vừa quan tâm.`,
    en: `An active product in the ${category} category matched to the segment interest.`,
    ja: `セグメントが関心を示した${category}カテゴリの有効な商品です。`,
  };

  return messages[language];
}

function addTrace(
  trace: AgentEvent[],
  type: AgentEvent["type"],
  status: AgentEvent["status"],
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const durationMs =
    typeof metadata?.durationMs === "number" ? metadata.durationMs : undefined;
  const rowCount =
    typeof metadata?.rowCount === "number" ? metadata.rowCount : undefined;
  const traceMetadata = metadata
    ? Object.fromEntries(
        Object.entries(metadata).filter(
          ([key]) => key !== "durationMs" && key !== "rowCount",
        ),
      )
    : undefined;

  trace.push({
    type,
    timestamp: new Date().toISOString(),
    status,
    message,
    durationMs,
    rowCount,
    metadata:
      traceMetadata && Object.keys(traceMetadata).length > 0
        ? traceMetadata
        : undefined,
  });
}

export type { ToolRegistryDependencies };
