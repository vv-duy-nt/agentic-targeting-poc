export class ProviderConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ProviderConfigurationError";
  }
}

export class ProviderResponseError extends Error {
  public constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderResponseError";
  }
}

export class ProviderRequestError extends Error {
  public constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderRequestError";
  }
}
