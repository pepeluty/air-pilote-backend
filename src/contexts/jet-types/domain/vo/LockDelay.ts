/**
 * LockDelay — value object for radar lock-on delay (jet-types context).
 *
 * Wraps a positive number (milliseconds). Throws {@link ValidationError}
 * when the input is not a number or is <= 0. Equality is value-based (same
 * number). Domain layer: framework-agnostic — no @nestjs/@mikro-orm.
 *
 * Spec delta: "Non-positive radar/missile value rejected" — GIVEN a
 * lockDelay <= 0 THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class LockDelay extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link LockDelay} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or is not
   * greater than 0.
   */
  static create(raw: number): LockDelay {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('lock_delay_required');
    }
    if (raw <= 0) {
      throw new ValidationError('lock_delay_must_be_positive');
    }
    return new LockDelay(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof LockDelay && other.value === this.value;
  }
}
