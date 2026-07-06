/**
 * Damage — value object for a jet type's per-hit projectile damage
 * (jet-types context).
 *
 * Wraps a positive number. Throws {@link ValidationError} when the input is
 * not a number or is <= 0 (spec: "damage > 0"). With enemy health fixed at
 * 100 (design Decision #5), the seed damages 30/45/80 yield 4/3/2 hits to
 * kill respectively. Equality is value-based. Domain layer:
 * framework-agnostic.
 *
 * Spec scenario: "Jet Type Properties Validation" — GIVEN a non-positive
 * damage THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class Damage extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link Damage} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or is not
   * greater than 0.
   */
  static create(raw: number): Damage {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('damage_required');
    }
    if (raw <= 0) {
      throw new ValidationError('damage_must_be_positive');
    }
    return new Damage(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof Damage && other.value === this.value;
  }
}
