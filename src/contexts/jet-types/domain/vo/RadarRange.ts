/**
 * RadarRange — value object for radar detection range (jet-types context).
 *
 * Wraps a positive number (pixels). Throws {@link ValidationError} when the
 * input is not a number or is <= 0. Equality is value-based (same number).
 * Domain layer: framework-agnostic — no @nestjs/@mikro-orm.
 *
 * Spec delta: "Non-positive radar/missile value rejected" — GIVEN a
 * radarRange <= 0 THEN the type is rejected with a validation error.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class RadarRange extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link RadarRange} from a raw number. Throws
   * {@link ValidationError} when the input is not a finite number or is not
   * greater than 0.
   */
  static create(raw: number): RadarRange {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('radar_range_required');
    }
    if (raw <= 0) {
      throw new ValidationError('radar_range_must_be_positive');
    }
    return new RadarRange(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof RadarRange && other.value === this.value;
  }
}
