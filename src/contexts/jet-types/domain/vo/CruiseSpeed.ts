/**
 * CruiseSpeed — value object for a jet type's cruising speed (jet-types
 * context).
 *
 * Wraps a positive number. Throws {@link ValidationError} when the input is
 * not a number or is <= 0 (spec: "maxSpeed > cruiseSpeed > 0"). The
 * cross-VO invariant `maxSpeed > cruiseSpeed` is enforced at the
 * {@link JetType} aggregate factory, not here — CruiseSpeed does not know
 * about maxSpeed. Equality is value-based. Domain layer: framework-agnostic.
 *
 * Spec scenario: "Jet Type Properties Validation" — GIVEN a non-positive
 * cruiseSpeed THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class CruiseSpeed extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link CruiseSpeed} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or is not
   * greater than 0.
   */
  static create(raw: number): CruiseSpeed {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('cruise_speed_required');
    }
    if (raw <= 0) {
      throw new ValidationError('cruise_speed_must_be_positive');
    }
    return new CruiseSpeed(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof CruiseSpeed && other.value === this.value;
  }
}
