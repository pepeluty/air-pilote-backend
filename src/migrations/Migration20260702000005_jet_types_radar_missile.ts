/**
 * jet_types radar + missile columns — add radar lock-on and heat-seeking
 * missile stats for the throttle flight model change (design: radar/missile
 * stats per jet type).
 *
 * Adds 7 numeric columns (NOT NULL DEFAULT 0), then updates the three seed
 * rows with the authoritative values (spec delta "Migration produces seeded
 * rows with 7 new values"):
 *
 *   Interceptor: lockDelay=400, radarRange=550, radarAngle=25, missileSpeed=380,
 *                missileTurnRate=5.0, missileLifetime=2500, missileDamage=60
 *   Balanced:    lockDelay=600, radarRange=500, radarAngle=30, missileSpeed=350,
 *                missileTurnRate=4.0, missileLifetime=3000, missileDamage=75
 *   Heavy:       lockDelay=1000, radarRange=450, radarAngle=35, missileSpeed=300,
 *                missileTurnRate=3.0, missileLifetime=3500, missileDamage=90
 *
 * The DEFAULT 0 ensures any existing rows (which don't exist in a seed-only
 * catalog, but defensive) have valid numeric values for the NOT NULL
 * constraint. The three seed rows are then overwritten with the real values.
 *
 * Order is CRITICAL — this migration MUST run AFTER
 * Migration20260629000004_jet_types_rotation_speed. The filename numbering
 * 00000005 ensures this.
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20260702000005_jet_types_radar_missile extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "jet_types"
        add column "lock_delay" numeric not null default 0;`,
    );
    this.addSql(
      `alter table "jet_types"
        add column "radar_range" numeric not null default 0;`,
    );
    this.addSql(
      `alter table "jet_types"
        add column "radar_angle" numeric not null default 0;`,
    );
    this.addSql(
      `alter table "jet_types"
        add column "missile_speed" numeric not null default 0;`,
    );
    this.addSql(
      `alter table "jet_types"
        add column "missile_turn_rate" numeric not null default 0;`,
    );
    this.addSql(
      `alter table "jet_types"
        add column "missile_lifetime" numeric not null default 0;`,
    );
    this.addSql(
      `alter table "jet_types"
        add column "missile_damage" numeric not null default 0;`,
    );

    // Overwrite the seed defaults with the authoritative radar/missile values.
    this.addSql(
      `update "jet_types" set "lock_delay" = 400, "radar_range" = 550, "radar_angle" = 25, "missile_speed" = 380, "missile_turn_rate" = 5.0, "missile_lifetime" = 2500, "missile_damage" = 60 where "name" = 'Interceptor';`,
    );
    this.addSql(
      `update "jet_types" set "lock_delay" = 600, "radar_range" = 500, "radar_angle" = 30, "missile_speed" = 350, "missile_turn_rate" = 4.0, "missile_lifetime" = 3000, "missile_damage" = 75 where "name" = 'Balanced';`,
    );
    this.addSql(
      `update "jet_types" set "lock_delay" = 1000, "radar_range" = 450, "radar_angle" = 35, "missile_speed" = 300, "missile_turn_rate" = 3.0, "missile_lifetime" = 3500, "missile_damage" = 90 where "name" = 'Heavy';`,
    );
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table "jet_types" drop column if exists "lock_delay";`,
    );
    this.addSql(
      `alter table "jet_types" drop column if exists "radar_range";`,
    );
    this.addSql(
      `alter table "jet_types" drop column if exists "radar_angle";`,
    );
    this.addSql(
      `alter table "jet_types" drop column if exists "missile_speed";`,
    );
    this.addSql(
      `alter table "jet_types" drop column if exists "missile_turn_rate";`,
    );
    this.addSql(
      `alter table "jet_types" drop column if exists "missile_lifetime";`,
    );
    this.addSql(
      `alter table "jet_types" drop column if exists "missile_damage";`,
    );
  }
}
