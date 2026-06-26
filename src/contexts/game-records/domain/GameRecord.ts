/**
 * GameRecord — game-records aggregate root.
 *
 * Owns one completed-game session for a single player: the player's userId, a
 * non-negative {@link Score} value object, the session duration in ms, and a
 * server-assigned timestamp. Constructed via the {@link GameRecord.create}
 * factory so the Score invariant (non-negative) is enforced at the edge
 * (spec: "score MUST be non-negative"). No ORM/Nest decorators — the
 * persistence model is {@link GameRecordEntity} in the infrastructure layer,
 * mapped to/from this domain entity (design Decision #2 Data Mapper + UoW).
 * Domain layer: framework-agnostic.
 *
 * Design data flow (c): gameOver -> POST /game-records -> PersistGameRecord ->
 * Score VO (rejects negative) -> GameRecord aggregate -> repository save.
 */
import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { Score } from './vo/Score';

export interface GameRecordProps {
  readonly id: string;
  readonly userId: string;
  readonly score: Score;
  readonly durationMs: number;
  readonly timestamp: Date;
}

export class GameRecord extends AggregateRoot<string> {
  public readonly userId: string;
  public readonly score: Score;
  public readonly durationMs: number;
  public readonly timestamp: Date;

  private constructor(props: GameRecordProps) {
    super(props.id);
    this.userId = props.userId;
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
   * verified access token).
   */
  static create(
    userId: string,
    score: Score,
    durationMs: number,
    id: string = randomUUID(),
    timestamp: Date = new Date(),
  ): GameRecord {
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new Error('game_record_user_id_required');
    }
    if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error('game_record_duration_ms_required');
    }
    return new GameRecord({ id, userId, score, durationMs, timestamp });
  }

  /** Rehydrate an aggregate from persistence (no invariant re-validation). */
  static rehydrate(props: GameRecordProps): GameRecord {
    return new GameRecord(props);
  }
}