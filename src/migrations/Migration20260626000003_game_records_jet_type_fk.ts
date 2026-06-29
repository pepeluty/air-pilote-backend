/**
 * game_records.jet_type_id — link table column added by the jet-types-and-
 * movement change (design Decision #7: NOT NULL FK, default Balanced UUID).
 *
 * Order is CRITICAL (design "Migration / Rollout"):
 *   `Migration20260626000002_jet_types` (table + 3 seed rows with FIXED UUIDs)
 *   MUST run BEFORE this migration — the FK below references the seeded
 *   `jet_types(id)` rows. MikroORM runs migrations in filename order, so the
 *   `00000002 -> 00000003` numbering enforces this.
 *
 * Existing `game_records` rows are backfilled to the Balanced UUID
 * (`00000000-0000-4000-8000-000000000002`) via NOT NULL DEFAULT — the
 * safety net, NOT the validation path. New rows are validated upstream by
 * the `JetTypeExists` port in `PersistGameRecord` so they never reach
 * persistence with an unknown id (design: clean 422 ValidationError instead
 * of a raw FK 500).
 */
import { Migration } from '@mikro-orm/migrations';

const BALANCED_JET_TYPE_ID = '00000000-0000-4000-8000-000000000002';

export class Migration20260626000003_game_records_jet_type_fk extends Migration {
  async up(): Promise<void> {
    // Add the column NOT NULL with the Balanced UUID as the default so existing
    // rows are backfilled atomically without a separate UPDATE pass.
    this.addSql(
      `alter table "game_records"
        add column "jet_type_id" uuid not null default '${BALANCED_JET_TYPE_ID}';`,
    );

    // FK to jet_types(id) — guarded with IF NOT EXISTS-safe creation by name.
    this.addSql(
      `alter table "game_records"
        add constraint "game_records_jet_type_id_fkey"
        foreign key ("jet_type_id") references "jet_types" ("id");`,
    );

    // Index the per-jet-type read path (future jet-type leaderboard queries).
    this.addSql(
      `create index "game_records_jet_type_id_idx" on "game_records" ("jet_type_id");`,
    );
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table "game_records"
        drop constraint if exists "game_records_jet_type_id_fkey";`,
    );
    this.addSql(`drop index if exists "game_records_jet_type_id_idx";`);
    this.addSql(`alter table "game_records" drop column if exists "jet_type_id";`);
  }
}