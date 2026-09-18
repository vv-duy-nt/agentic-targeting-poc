import type { z } from "zod";
import { ProviderResponseError } from "./errors.js";

export function parseStructuredResponse<TSchema extends z.ZodTypeAny>(
  text: string,
  schema: TSchema,
): z.infer<TSchema> {
  const normalized = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let json: unknown;

  try {
    json = JSON.parse(normalized);
  } catch (error) {
    throw new ProviderResponseError(
      "The provider did not return valid JSON for the structured response.",
      { cause: error },
    );
  }

  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    throw new ProviderResponseError(
      `The provider response does not match the expected schema: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
