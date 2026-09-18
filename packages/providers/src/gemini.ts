import { GoogleGenerativeAI } from "@google/generative-ai";
import type { z } from "zod";
import {
  ProviderConfigurationError,
  ProviderRequestError,
} from "./errors.js";
import type { GenerateStructuredInput, LLMProvider } from "./provider.js";
import { parseStructuredResponse } from "./structured-response.js";

export type GeminiProviderOptions = {
  apiKey?: string;
  model?: string;
};

export class GeminiProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly modelName: string;

  public constructor(options: GeminiProviderOptions) {
    const apiKey = options.apiKey?.trim();

    if (!apiKey) {
      throw new ProviderConfigurationError(
        "AI_API_KEY is required when AI_PROVIDER=gemini.",
      );
    }

    const modelName = options.model?.trim();

    if (!modelName) {
      throw new ProviderConfigurationError(
        "AI_MODEL is required when AI_PROVIDER=gemini.",
      );
    }

    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  public async generateStructured<TSchema extends z.ZodTypeAny>(
    input: GenerateStructuredInput<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const client = new GoogleGenerativeAI(this.apiKey);
    const model = client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: input.temperature ?? 0,
        maxOutputTokens: input.maxOutputTokens ?? 1_024,
      },
    });

    let text: string;

    try {
      const result = await model.generateContent(
        this.buildPrompt(input.systemPrompt, input.userPrompt),
      );
      text = result.response.text();
    } catch (error) {
      throw new ProviderRequestError(
        "Gemini could not generate a response. Check the model, API key, and network.",
        { cause: error },
      );
    }

    return parseStructuredResponse(text, input.schema);
  }

  private buildPrompt(systemPrompt: string, userPrompt: string): string {
    return [
      "<system_instruction>",
      systemPrompt,
      "</system_instruction>",
      "",
      "Return exactly one valid JSON object. Do not use Markdown, code fences, or extra text.",
      "",
      "<user_request>",
      userPrompt,
      "</user_request>",
    ].join("\n");
  }
}
