import type { z } from "zod";
import type {
  agentEventSchema,
  agentRunRequestSchema,
  agentRunResultSchema,
  customerSchema,
  customerSegmentItemSchema,
  productSchema,
  sqlValidationResultSchema,
  sqlValidationRuleSchema,
} from "./schemas.js";

export type Customer = z.infer<typeof customerSchema>;
export type Product = z.infer<typeof productSchema>;
export type CustomerSegmentItem = z.infer<typeof customerSegmentItemSchema>;
export type SqlValidationRule = z.infer<typeof sqlValidationRuleSchema>;
export type SqlValidationResult = z.infer<typeof sqlValidationResultSchema>;
export type AgentEvent = z.infer<typeof agentEventSchema>;
export type AgentRunRequest = z.infer<typeof agentRunRequestSchema>;
export type AgentRunResult = z.infer<typeof agentRunResultSchema>;
