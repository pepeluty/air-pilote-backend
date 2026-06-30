/**
 * RotationSpeed — value object for a jet type's rotation speed (jet-types
 * context).
 *
 * Wraps a positive number (radians/second). Throws {@link ValidationError}
 * when the input is not a number or is <= 0. Equality is value-based (same
 * number). Domain layer: framework-agnostic — no @nestjs/@mikro-orm.
 *
 * Spec delta: "Invalid rotationSpeed rejected" — GIVEN a rotationSpeed <= 0
 * THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class RotationSpeed extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link RotationSpeed} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or is not
   * greater than 0.
   */
  static create(raw: number): RotationSpeed {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('rotation_speed_required');
    }
    if (raw <= 0) {
      throw new ValidationError('rotation_speed_must_be_positive');
    }
    return new RotationSpeed(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof RotationSpeed && other.value === this.value;
  }
}
