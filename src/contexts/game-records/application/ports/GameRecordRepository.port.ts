/**
 * GameRecordRepository — outbound port for GameRecord aggregate persistence
 * (game-records write model) + per-player read projections (high score,
 * history). Implemented by the MikroORM adapter in the infrastructure layer.
 *
 * Application layer: framework-agnostic — no @nestjs/@mikro-orm.
 *
 * Pagination: `PageOpts` selects a page by `limit`/`offset`; `Page<T>`
 * returns the slice plus `total` and `hasMore` so a client can fetch the next
 * page (spec: "cursor or total to fetch the next page"). History is always
 * scoped to a single userId (the authenticated caller) — there is no
 * cross-user query, satisfying "Cannot access other players' records".
 */
import type { Port } from '@shared/application/Port';
import type { GameRecord } from '../../domain/GameRecord';

/** Page selection input (0-based offset). */
export interface PageOpts {
  readonly limit: number;
  readonly offset: number;
}

/** Page result — the slice plus total count and a has-more flag. */
export interface Page<T> {
  readonly items: T[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface GameRecordRepository extends Port {
  /** Persist a single session record. Returns the saved aggregate. */
  save(r: GameRecord): Promise<GameRecord>;

  /** Highest score for `userId`, or null when the player has no records. */
  highScoreOf(userId: string): Promise<number | null>;

  /**
   * List `userId`'s records ordered most-recent first, sliced by `opts`.
   * Returns the slice plus total + hasMore (pagination past the end yields an
   * empty items array without error — spec: "Pagination past the end").
   */
  listByUser(userId: string, opts: PageOpts): Promise<Page<GameRecord>>;
}