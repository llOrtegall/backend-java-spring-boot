export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {}
export class ConflictError extends DomainError {}
export class ForbiddenError extends DomainError {}
export class ValidationError extends DomainError {}
export class AuthError extends DomainError {}

export class RateLimitError extends DomainError {
  constructor(public readonly retryAfter: number) {
    super("Too many requests");
  }
}
