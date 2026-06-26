/**
 * DomainError — base for the typed exception model (design Decision #10, W7).
 *
 * Subclasses carry their semantic identity in their class name and are mapped
 * to HTTP status codes by {@link DomainExceptionFilter}. The `code` field is
 * a stable machine-readable string (defaults to the class name) so clients
 * can switch on it without parsing the human message.
 *
 * Shared kernel: framework-agnostic (no @nestjs/* or @mikro-orm/*).
 */
export class DomainError extends Error {
  constructor(readonly code: string) {
    super(code);
    // Restore the prototype chain — required when targeting ES2015+ and
    // extending built-ins like Error; otherwise instanceof checks break.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}
