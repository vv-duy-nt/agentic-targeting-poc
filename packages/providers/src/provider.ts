import type { z } from "zod";

export type GenerateStructuredInput<TSchema extends z.ZodTypeAny> = {
  systemPrompt: string;
  userPrompt: string;
  schema: TSchema;
  maxOutputTokens?: number;
  temperature?: number;
};

export interface LLMProvider {
  generateStructured<TSchema extends z.ZodTypeAny>(
    input: GenerateStructuredInput<TSchema>,
  ): Promise<z.infer<TSchema>>;
}
