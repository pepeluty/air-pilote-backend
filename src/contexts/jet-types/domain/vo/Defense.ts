/**
 * Defense — value object for a jet type's defense percentage (jet-types
 * context).
 *
 * Wraps an integer in the closed range [0, 100]. Throws
 * {@link ValidationError} when the input is not a number or falls outside
 * [0, 100] (spec: "defense in [0, 100]"). Used by the contact-damage formula
 * `actualDamage = ENEMY_CONTACT_DAMAGE * (1 - defense / 100)` (design
 * Decision #6). Equality is value-based. Domain layer: framework-agnostic.
 *
 * Spec scenario: "Jet Type Properties Validation" — GIVEN a defense outside
 * [0, 100] THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class Defense extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link Defense} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or is
   * outside the closed range [0, 100].
   */
  static create(raw: number): Defense {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('defense_required');
    }
    if (raw < 0 || raw > 100) {
      throw new ValidationError('defense_out_of_range');
    }
    return new Defense(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof Defense && other.value === this.value;
  }
}
