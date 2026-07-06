/**
 * MissileSpeed — value object for heat-seeking missile speed (jet-types
 * context).
 *
 * Wraps a positive number (pixels/second). Throws {@link ValidationError}
 * when the input is not a number or is <= 0. Equality is value-based (same
 * number). Domain layer: framework-agnostic — no @nestjs/@mikro-orm.
 *
 * Spec delta: "Non-positive radar/missile value rejected" — GIVEN a
 * missileSpeed <= 0 THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class MissileSpeed extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link MissileSpeed} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or is not
   * greater than 0.
   */
  static create(raw: number): MissileSpeed {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('missile_speed_required');
    }
    if (raw <= 0) {
      throw new ValidationError('missile_speed_must_be_positive');
    }
    return new MissileSpeed(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof MissileSpeed && other.value === this.value;
  }
}
