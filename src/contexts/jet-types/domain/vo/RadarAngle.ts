/**
 * RadarAngle — value object for radar cone half-angle (jet-types context).
 *
 * Wraps a number in the open range (0, 90) (degrees). Throws
 * {@link ValidationError} when the input is not a number, <= 0, or >= 90.
 * Equality is value-based (same number). Domain layer: framework-agnostic —
 * no @nestjs/@mikro-orm.
 *
 * Spec delta: "Invalid radarAngle rejected" — GIVEN radarAngle <= 0 or
 * >= 90 THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class RadarAngle extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link RadarAngle} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or falls
   * outside the open range (0, 90).
   */
  static create(raw: number): RadarAngle {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('radar_angle_required');
    }
    if (raw <= 0 || raw >= 90) {
      throw new ValidationError('radar_angle_out_of_range');
    }
    return new RadarAngle(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof RadarAngle && other.value === this.value;
  }
}
