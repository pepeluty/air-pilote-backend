/**
 * MissileLifetime — value object for heat-seeking missile max lifetime
 * (jet-types context).
 *
 * Wraps a positive number (milliseconds). Throws {@link ValidationError}
 * when the input is not a number or is <= 0. Equality is value-based (same
 * number). Domain layer: framework-agnostic — no @nestjs/@mikro-orm.
 *
 * Spec delta: "Non-positive radar/missile value rejected" — GIVEN a
 * missileLifetime <= 0 THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class MissileLifetime extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link MissileLifetime} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or is not
   * greater than 0.
   */
  static create(raw: number): MissileLifetime {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('missile_lifetime_required');
    }
    if (raw <= 0) {
      throw new ValidationError('missile_lifetime_must_be_positive');
    }
    return new MissileLifetime(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof MissileLifetime && other.value === this.value;
  }
}
