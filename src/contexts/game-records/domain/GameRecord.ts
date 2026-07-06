/**
 * GameRecord — game-records aggregate root.
 *
 * Owns one completed-game session for a single player: the player's userId, the
 * `jetTypeId` of the selected jet type, a non-negative {@link Score} value
 * object, the session duration in ms, and a server-assigned timestamp.
 * Constructed via the {@link GameRecord.create} factory so the Score invariant
 * (non-negative) and the `jetTypeId` presence invariant are enforced at the
 * edge (spec: "score MUST be non-negative", "jetTypeId MUST reference an
 * existing jet type"). No ORM/Nest decorators — the persistence model is
 * {@link GameRecordEntity} in the infrastructure layer, mapped to/from this
 * domain entity (design Decision #2 Data Mapper + UoW). Domain layer:
 * framework-agnostic.
 *
 * Design data flow (c): gameOver -> POST /game-records -> PersistGameRecord ->
 * JetTypeExists (rejects unknown -> ValidationError 422) -> Score VO (rejects
 * negative) -> GameRecord aggregate -> repository save.
 *
 * Spec MODIFIED requirement "Persist Game Record": persistence now also
 * includes `jetTypeId`. Spec MODIFIED requirement "List Game Records by User":
 * each returned record MUST include `jetTypeId`.
 */
import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { ValidationError } from '@shared/errors';
import { Score } from './vo/Score';

export interface GameRecordProps {
  readonly id: string;
  readonly userId: string;
  readonly jetTypeId: string;
  readonly score: Score;
  readonly durationMs: number;
  readonly timestamp: Date;
}

export class GameRecord extends AggregateRoot<string> {
  public readonly userId: string;
  public readonly jetTypeId: string;
  public readonly score: Score;
  public readonly durationMs: number;
  public readonly timestamp: Date;

  private constructor(props: GameRecordProps) {
    super(props.id);
    this.userId = props.userId;
    this.jetTypeId = props.jetTypeId;
    this.score = props.score;
    this.durationMs = props.durationMs;
    this.timestamp = props.timestamp;
  }

  /**
   * Factory for a freshly completed game session. A new id is assigned and the
   * timestamp defaults to now. The raw score is wrapped in a {@link Score} VO
   * so the non-negative invariant is enforced here (throws ValidationError on
   * a negative score). `userId` MUST be the authenticated caller's userId
   * (never taken from the request body — the controller passes it from the
   * verified access token). `jetTypeId` MUST be a non-empty string — the
   * `JetTypeExists` check in `PersistGameRecord` rejects unknown ids with a
   * clean 422 ValidationError BEFORE this aggregate is created; the presence
   * guard here is the domain-edge backstop (design Decision #7).
   */
  static create(
    userId: string,
    jetTypeId: string,
    score: Score,
    durationMs: number,
    id: string = randomUUID(),
    timestamp: Date = new Date(),
  ): GameRecord {
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new ValidationError('game_record_user_id_required');
    }
    if (typeof jetTypeId !== 'string' || jetTypeId.length === 0) {
      throw new ValidationError('game_record_jet_type_id_required');
    }
    if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('game_record_duration_ms_required');
    }
    return new GameRecord({ id, userId, jetTypeId, score, durationMs, timestamp });
  }

  /** Rehydrate an aggregate from persistence (no invariant re-validation). */
  static rehydrate(props: GameRecordProps): GameRecord {
    return new GameRecord(props);
  }
}