/**
 * Base ValueObject — value-based equality.
 *
 * Two value objects are equal iff they share the same concrete type and equal
 * property values. VOs are immutable and have no identity. Domain layer:
 * framework-agnostic (no @nestjs/@mikro-orm).
 */
export abstract class ValueObject {
  abstract equals(other: unknown): boolean;
}