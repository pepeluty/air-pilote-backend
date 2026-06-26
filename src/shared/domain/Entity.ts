/**
 * Base Entity — identity-based equality.
 *
 * Two entities are equal iff they share the same concrete type and the same
 * identity (`id`). Domain layer: framework-agnostic (no @nestjs/@mikro-orm).
 */
export abstract class Entity<TId> {
  protected constructor(public readonly id: TId) {}

  equals(other: unknown): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    if (!(other instanceof Entity)) return false;
    return this.id === (other as Entity<TId>).id;
  }
}