export class IntegrationReconnectRequiredError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IntegrationReconnectRequiredError";
  }
}

export function isReconnectRequiredStatus(status: number): boolean {
  return status === 400 || status === 401 || status === 403;
}
