/**
 * jet_types rotation_speed — add rotation speed column for the throttle flight
 * model change (design: rotationSpeed per jet type in rad/s).
 *
 * Adds `rotation_speed numeric NOT NULL DEFAULT 0`, then updates the three
 * seed rows with the authoritative values (spec delta "Migration produces
 * three seeded rows with rotationSpeed"):
 *   - Interceptor: 6.0 rad/s
 *   - Balanced:    4.5 rad/s
 *   - Heavy:       3.0 rad/s
 *
 * The DEFAULT 0 ensures any existing rows (which don't exist in a seed-only
 * catalog, but defensive) have a valid numeric value for the NOT NULL
 * constraint. The three seed rows are then overwritten with the real values.
 *
 * Order is CRITICAL — this migration MUST run AFTER the
 * Migration20260626000002_jet_types migration that creates the table and seeds
 * the three rows. The filename numbering 00000004 ensures this.
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20260629000004_jet_types_rotation_speed extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "jet_types"
        add column "rotation_speed" numeric not null default 0;`,
    );

    // Overwrite the seed defaults with the authoritative rotation speed values.
    this.addSql(
      `update "jet_types" set "rotation_speed" = 6.0 where "name" = 'Interceptor';`,
    );
    this.addSql(
      `update "jet_types" set "rotation_speed" = 4.5 where "name" = 'Balanced';`,
    );
    this.addSql(
      `update "jet_types" set "rotation_speed" = 3.0 where "name" = 'Heavy';`,
    );
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table "jet_types" drop column if exists "rotation_speed";`,
    );
  }
}
