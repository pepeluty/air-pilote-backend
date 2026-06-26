/**
 * Score — value object for a completed-game score (game-records context).
 *
 * Wraps a non-negative integer. Throws {@link ValidationError} when negative
 * (spec: "Negative score rejected"). Equality is value-based (same number).
 * Domain layer: framework-agnostic — no @nestjs/@mikro-orm.
 *
 * Spec scenario: "Negative score rejected" — GIVEN score -5 THEN the persist
 * request is rejected with a validation error and no record is stored.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

export class Score extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  /**
   * Build a {@link Score} from a raw number. Throws {@link ValidationError}
   * when the input is not a number or is negative. Score MUST be non-negative
   * (spec requirement "score MUST be non-negative").
   */
  static create(raw: number): Score {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new ValidationError('score_required');
    }
    if (raw < 0) {
      throw new ValidationError('score_must_be_non_negative');
    }
    return new Score(raw);
  }

  equals(other: unknown): boolean {
    return other instanceof Score && other.value === this.value;
  }
}