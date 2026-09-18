import type { z } from "zod";
import {
  ProviderConfigurationError,
  ProviderRequestError,
  ProviderResponseError,
} from "./errors.js";
import type { GenerateStructuredInput, LLMProvider } from "./provider.js";
import { parseStructuredResponse } from "./structured-response.js";

export type OpenAiCompatibleProviderOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};

export class OpenAiCompatibleProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  public constructor(options: OpenAiCompatibleProviderOptions) {
    const apiKey = options.apiKey?.trim();
    const model = options.model?.trim();
    const baseUrl = options.baseUrl?.trim().replace(/\/+$/, "");

    if (!apiKey || !model || !baseUrl) {
      throw new ProviderConfigurationError(
        "AI_API_KEY, AI_MODEL, and AI_BASE_URL are required for an OpenAI-compatible provider.",
      );
    }

    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  public async generateStructured<TSchema extends z.ZodTypeAny>(
    input: GenerateStructuredInput<TSchema>,
  ): Promise<z.infer<TSchema>> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userPrompt },
          ],
          temperature: input.temperature ?? 0,
          max_tokens: input.maxOutputTokens ?? 1_024,
          response_format: { type: "json_object" },
        }),
      });
    } catch (error) {
      throw new ProviderRequestError(
        "The OpenAI-compatible provider could not be reached.",
        { cause: error },
      );
    }

    if (!response.ok) {
      throw new ProviderRequestError(
        `The OpenAI-compatible provider returned HTTP ${response.status}.`,
      );
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      throw new ProviderResponseError(
        "The OpenAI-compatible provider returned an invalid JSON response.",
        { cause: error },
      );
    }

    const content = getMessageContent(payload);
    return parseStructuredResponse(content, input.schema);
  }
}

function getMessageContent(payload: unknown): string {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("choices" in payload) ||
    !Array.isArray(payload.choices)
  ) {
    throw new ProviderResponseError(
      "The OpenAI-compatible response does not contain choices.",
    );
  }

  const firstChoice = payload.choices[0];

  if (
    typeof firstChoice !== "object" ||
    firstChoice === null ||
    !("message" in firstChoice) ||
    typeof firstChoice.message !== "object" ||
    firstChoice.message === null ||
    !("content" in firstChoice.message) ||
    typeof firstChoice.message.content !== "string"
  ) {
    throw new ProviderResponseError(
      "The OpenAI-compatible response does not contain message content.",
    );
  }

  return firstChoice.message.content;
}
