export class BillingError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "BillingError";
  }
}

export class BillingConfigurationError extends BillingError {
  constructor(message: string, statusCode = 500) {
    super(message, statusCode);
    this.name = "BillingConfigurationError";
  }
}

export class BillingValidationError extends BillingError {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode);
    this.name = "BillingValidationError";
  }
}

export class UnsupportedWebhookEventError extends BillingValidationError {
  constructor(eventName: string) {
    super(`Unsupported Lemon Squeezy webhook event: ${eventName}`, 400);
    this.name = "UnsupportedWebhookEventError";
  }
}
