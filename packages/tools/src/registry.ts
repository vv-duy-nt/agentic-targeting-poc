import {
  executeValidatedSql,
  findProducts,
  getDatabaseSchema,
  getProductById,
  getTableSchema,
  type ProductFilter,
} from "@poc/database";
import { tableNameSchema } from "@poc/shared";
import { validateSql } from "@poc/sql-validator";
import type { StorageClient } from "@poc/storage";
import type { Pool } from "pg";
import { z } from "zod";

export type ToolDefinition<TInput extends z.ZodTypeAny, TOutput> = {
  description: string;
  inputSchema: TInput;
  execute(input: z.input<TInput>): Promise<TOutput>;
};

export type ToolRegistryDependencies = {
  adminPool: Pool;
  agentPool: Pool;
  storage: StorageClient;
  maxRows?: number;
};

const emptyInputSchema = z.object({}).strict();
const tableInputSchema = z.object({ table: tableNameSchema });
const sqlInputSchema = z.object({
  sql: z.string().trim().min(1).max(20_000),
});
const productFilterSchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
  active: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
const productImageInputSchema = z.object({
  productId: z.number().int().positive(),
});

export type ToolRegistry = ReturnType<typeof createToolRegistry>;

export function createToolRegistry(dependencies: ToolRegistryDependencies) {
  const maxRows = dependencies.maxRows ?? 100;

  return {
    get_database_schema: defineTool(
      "Return metadata for all allowlisted database tables.",
      emptyInputSchema,
      async () => getDatabaseSchema(dependencies.adminPool),
    ),
    get_table_schema: defineTool(
      "Return metadata for one allowlisted database table.",
      tableInputSchema,
      async ({ table }) => getTableSchema(dependencies.adminPool, table),
    ),
    validate_sql: defineTool(
      "Validate generated SQL. Customer targeting always requires marketing consent.",
      sqlInputSchema,
      async ({ sql }) =>
        validateSql(sql, { requireMarketingConsent: true, maxRows }),
    ),
    execute_sql: defineTool(
      "Validate and execute one read-only customer-targeting SELECT with agent_reader.",
      sqlInputSchema,
      async ({ sql }) => {
        const validation = validateSql(sql, {
          requireMarketingConsent: true,
          maxRows,
        });

        if (!validation.valid) {
          return { validation, rows: [], rowCount: 0, durationMs: 0 };
        }

        return {
          validation,
          ...(await executeValidatedSql(dependencies.agentPool, validation)),
        };
      },
    ),
    find_products: defineTool(
      "Find active products for a category using the read-only agent database role.",
      productFilterSchema,
      async (filters) =>
        findProducts(dependencies.agentPool, filters as ProductFilter),
    ),
    get_product_image: defineTool(
      "Resolve a product imageKey to a short-lived object-storage URL.",
      productImageInputSchema,
      async ({ productId }) => {
        const product = await getProductById(dependencies.agentPool, productId);

        if (!product) {
          throw new ToolExecutionError(`Product ${productId} was not found.`);
        }

        if (!product.imageKey) {
          throw new ToolExecutionError(`Product ${productId} has no imageKey.`);
        }

        return {
          productId: product.id,
          imageKey: product.imageKey,
          imageUrl: await dependencies.storage.getPresignedUrl(product.imageKey),
        };
      },
    ),
  };
}

export class ToolExecutionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

function defineTool<TInput extends z.ZodTypeAny, TOutput>(
  description: string,
  inputSchema: TInput,
  handler: (input: z.output<TInput>) => Promise<TOutput>,
): ToolDefinition<TInput, TOutput> {
  return {
    description,
    inputSchema,
    async execute(input: z.input<TInput>): Promise<TOutput> {
      return handler(inputSchema.parse(input));
    },
  };
}
