import { GeminiProvider } from "./gemini.js";
import { ProviderConfigurationError } from "./errors.js";
import { OpenAiCompatibleProvider } from "./openai-compatible.js";
import type { LLMProvider } from "./provider.js";

export type ProviderFactoryOptions = {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};

export function createProvider(options: ProviderFactoryOptions): LLMProvider {
  const provider = options.provider?.trim().toLowerCase();

  if (!provider) {
    throw new ProviderConfigurationError(
      "AI_PROVIDER is required to create an LLM provider.",
    );
  }

  if (provider === "gemini") {
    return new GeminiProvider({
      apiKey: options.apiKey,
      model: options.model,
    });
  }

  if (provider === "openai-compatible") {
    return new OpenAiCompatibleProvider({
      apiKey: options.apiKey,
      model: options.model,
      baseUrl: options.baseUrl,
    });
  }

  throw new ProviderConfigurationError(
    `AI provider "${provider}" is not implemented. Supported providers: gemini, openai-compatible.`,
  );
}
