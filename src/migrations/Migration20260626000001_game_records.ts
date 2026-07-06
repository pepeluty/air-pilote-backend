/**
 * game_records migration — game-records context schema.
 *
 * Column names are snake_case, matching the UnderscoreNamingStrategy
 * configured in AppModule. `score` is an integer (a non-negative score per
 * spec — enforced at the domain edge by the {@link Score} VO before reaching
 * persistence, so no CHECK is required here; a CHECK is added defensively to
 * keep the invariant in storage too). `duration_ms` is a non-negative integer
 * (milliseconds). `timestamp` is server-assigned on persist.
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20260626000001_game_records extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "game_records" (
        "id" uuid not null primary key,
        "user_id" uuid not null,
        "score" integer not null,
        "duration_ms" integer not null,
        "timestamp" timestamptz not null,
        constraint "game_records_score_check" check ("score" >= 0),
        constraint "game_records_duration_ms_check" check ("duration_ms" >= 0)
      );`,
    );

    // Index the per-user history + high-score lookups (the two read paths).
    this.addSql(
      `create index "game_records_user_id_idx" on "game_records" ("user_id");`,
    );
    // Composite index for the common list-by-user order-by-timestamp-desc query.
    this.addSql(
      `create index "game_records_user_id_timestamp_idx" on "game_records" ("user_id", "timestamp" desc);`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "game_records";`);
  }
}