/**
 * Speed — value object for a jet type's maximum speed (jet-types context).
 *
 * Wraps a positive number. Throws {@link ValidationError} when the input is
 * not a number or is <= 0 (spec: "maxSpeed > cruiseSpeed > 0"). Equality is
 * value-based (same number). Domain layer: framework-agnostic — no
 * @nestjs/@mikro-orm.
 *
 * Spec scenario: "Jet Type Properties Validation" — GIVEN a non-positive
 * maxSpeed THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class Speed extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link Speed} from a raw number. Throws {@link ValidationError}
   * when the input is not a finite number or is not greater than 0.
   */
  static create(raw: number): Speed {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('speed_required');
    }
    if (raw <= 0) {
      throw new ValidationError('speed_must_be_positive');
    }
    return new Speed(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof Speed && other.value === this.value;
  }
}
