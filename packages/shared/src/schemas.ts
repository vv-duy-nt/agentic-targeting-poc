import { z } from "zod";
import { AGENT_EVENT_TYPES, ALLOWED_TABLES } from "./constants.js";

export const tableNameSchema = z.enum(ALLOWED_TABLES);

export const customerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  gender: z.string().nullable(),
  age: z.number().int().nullable(),
  city: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export const productSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  category: z.string(),
  price: z.number().nonnegative(),
  imageKey: z.string().nullable(),
  active: z.boolean(),
});

export const customerSegmentItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  city: z.string(),
  email: z.string().email().optional(),
  totalSpent: z.number().nonnegative().optional(),
});

export const sqlValidationRuleSchema = z.object({
  rule: z.string(),
  passed: z.boolean(),
  message: z.string().optional(),
});

export const sqlValidationResultSchema = z.object({
  valid: z.boolean(),
  normalizedSql: z.string().optional(),
  reason: z.string().optional(),
  rules: z.array(sqlValidationRuleSchema),
});

export const sqlGenerationIntentSchema = z.enum([
  "customer_segmentation",
  "product_lookup",
  "unsupported",
]);

export const supportedLanguageSchema = z.enum(["vi", "en", "ja"]);

export const sqlGenerationSchema = z
  .object({
    intent: sqlGenerationIntentSchema,
    language: supportedLanguageSchema,
    sql: z.string().trim().min(1).max(20_000).nullable(),
    explanation: z.string().trim().min(1).max(2_000),
    tablesUsed: z.array(tableNameSchema).max(ALLOWED_TABLES.length),
    error: z.string().trim().min(1).max(1_000).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.intent === "unsupported" && value.sql !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unsupported requests must not include SQL.",
        path: ["sql"],
      });
    }

    if (value.intent !== "unsupported" && value.sql === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Supported requests must include SQL.",
        path: ["sql"],
      });
    }
  });

export const agentEventSchema = z.object({
  type: z.enum(AGENT_EVENT_TYPES),
  timestamp: z.string().datetime(),
  status: z.enum(["success", "failed", "running"]),
  message: z.string(),
  durationMs: z.number().nonnegative().optional(),
  rowCount: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const agentRunRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
});

export const agentRunResultSchema = z.object({
  executionId: z.string().uuid(),
  request: z.string(),
  sql: z.string().optional(),
  validation: sqlValidationResultSchema.optional(),
  segment: z.object({
    count: z.number().int().nonnegative(),
    customers: z.array(customerSegmentItemSchema),
  }).optional(),
  product: productSchema.extend({ reason: z.string() }).optional(),
  imageUrl: z.string().url().optional(),
  trace: z.array(agentEventSchema),
  errorCode: z.string().optional(),
});
