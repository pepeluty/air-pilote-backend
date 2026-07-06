/**
 * jet_types migration — jet-types context schema + seed (design Decision #2:
 * seed-only catalog with FIXED UUIDs).
 *
 * Column names are snake_case, matching the UnderscoreNamingStrategy
 * configured in AppModule (`maxSpeed` -> `max_speed`, `cruiseSpeed` ->
 * `cruise_speed`, `accelerationRate` -> `acceleration_rate`). All columns
 * are NOT NULL: the domain stat value objects enforce the invariants before
 * persistence, and seed rows are authored by this migration so they are
 * always valid.
 *
 * Three seed rows are inserted with authoritatively fixed UUIDs so the
 * cross-context `JET_TYPE_EXISTS` lookups from game-records resolve
 * deterministically:
 *   - Interceptor: 460 / 200 / 4.0 / 10 / 30
 *   - Balanced:    360 / 200 / 5.0 / 35 / 45
 *   - Heavy:       280 / 180 / 6.0 / 60 / 80
 * (`max_speed` / `cruise_speed` / `acceleration_rate` / `defense` / `damage`).
 *
 * `acceleration_rate` is numeric (the k coefficient is fractional: 4.0/5.0/6.0
 * per SECOND, design Decision #3 — NOT the exploration's per-ms draft).
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20260626000002_jet_types extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "jet_types" (
        "id" uuid not null primary key,
        "name" varchar(255) not null,
        "max_speed" integer not null,
        "cruise_speed" integer not null,
        "acceleration_rate" numeric not null,
        "defense" integer not null,
        "damage" integer not null
      );`,
    );

    // Seed the three canonical jet types with FIXED UUIDs (design Decision #2).
    this.addSql(
      `insert into "jet_types" ("id", "name", "max_speed", "cruise_speed", "acceleration_rate", "defense", "damage") values
        ('00000000-0000-4000-8000-000000000001', 'Interceptor', 460, 200, 4.0, 10, 30),
        ('00000000-0000-4000-8000-000000000002', 'Balanced', 360, 200, 5.0, 35, 45),
        ('00000000-0000-4000-8000-000000000003', 'Heavy', 280, 180, 6.0, 60, 80);`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "jet_types";`);
  }
}