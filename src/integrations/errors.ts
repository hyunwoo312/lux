export class IntegrationReconnectRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationReconnectRequiredError";
  }
}

export class IntegrationTemporaryAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationTemporaryAuthError";
  }
}

export function isReconnectRequiredStatus(status: number): boolean {
  return status === 400 || status === 401 || status === 403;
}
