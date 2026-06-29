/**
 * AccelerationRate — value object for a jet type's per-second acceleration
 * coefficient (jet-types context).
 *
 * Wraps a positive number (the exponential Euler integrator's `k`, stored
 * PER SECOND per design Decision #3 — seed values 4.0/5.0/6.0, NOT the
 * exploration's per-ms 0.004/0.005/0.006 draft). Throws
 * {@link ValidationError} when the input is not a number or is <= 0 (spec:
 * "accelerationRate > 0"). Equality is value-based. Domain layer:
 * framework-agnostic.
 *
 * Spec scenario: "Jet Type Properties Validation" — GIVEN a non-positive
 * accelerationRate THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class AccelerationRate extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build an {@link AccelerationRate} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or is not
   * greater than 0.
   */
  static create(raw: number): AccelerationRate {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('acceleration_rate_required');
    }
    if (raw <= 0) {
      throw new ValidationError('acceleration_rate_must_be_positive');
    }
    return new AccelerationRate(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof AccelerationRate && other.value === this.value;
  }
}
