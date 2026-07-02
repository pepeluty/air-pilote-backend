/**
 * Jet-types infrastructure — Postgres integration tests (task 7.3; spec
 * backend-jet-types: "Jet Type Catalog" + backend-game-records FK default).
 *
 * Boots the REAL testcontainer Postgres via the shared `db-harness`, which now
 * runs ALL migrations (initial + game_records + jet_types seed +
 * game_records_jet_type_fk). Exercises the real schema + seed:
 *
 *   - `jet_types` table has exactly 3 rows with the FIXED UUIDs and the
 *     authoritative seed stats (460/200/4.0/10/30, 360/200/5.0/35/45,
 *     280/180/6.0/60/80) — Migration20260626000002.
 *   - `JetTypeRepositoryAdapter` reads the 3 rows back as domain aggregates
 *     AND the `JetTypeExists` port returns true/false for known/unknown ids.
 *   - `JetTypesController.list()` returns the 3 types (controller → use case →
 *     adapter → real Postgres pipeline). The `@Public` no-auth surface is
 *     covered by the AuthGuard unit test (`@Public route -> allowed without a
 *     token`); this spec proves the pipeline returns the catalog.
 *   - `game_records.jet_type_id` column: NOT NULL, FK to `jet_types(id)`,
 *     default = the Balanced UUID (Migration20260626000003).
 *   - Inserting a game_record WITHOUT specifying `jet_type_id` backfills to
 *     the Balanced UUID via the DB-level DEFAULT.
 *   - Inserting with a non-existent `jet_type_id` raises an FK violation at
 *     the database level (the clean 422 path in `PersistGameRecord` is the
 *     normal validation; this is the storage-level backstop).
 *
 * Requires Docker; skipped when Docker is unavailable so the unit-test gate
 * stays green in environments without Docker.
 */
import { execSync } from 'node:child_process';
import { getEm, startDatabase, stopDatabase } from './db-harness';
import { JetTypeRepositoryAdapter } from '../contexts/jet-types/infrastructure/persistence/JetTypeRepositoryAdapter';
import { JetTypesController } from '../contexts/jet-types/infrastructure/controllers/JetTypesController';
import { ListJetTypes } from '../contexts/jet-types/application/usecases/ListJetTypes';

/** Fixed seed UUIDs (design "Fixed seed UUIDs"). */
const INTERCEPTOR_ID = '00000000-0000-4000-8000-000000000001';
const BALANCED_ID = '00000000-0000-4000-8000-000000000002';
const HEAVY_ID = '00000000-0000-4000-8000-000000000003';
const UNKNOWN_ID = 'ffffffff-ffff-4000-8000-ffffffffffff';

function dockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const RUN = dockerAvailable();
const describeOrSkip = RUN ? describe : describe.skip;

/** Minimal typed handle for raw SQL execution on the SqlEntityManager. */
type RawSql = {
  execute(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
};

jest.setTimeout(180_000);

describeOrSkip('Jet-types infrastructure (Postgres via testcontainers)', () => {
  beforeAll(async () => {
    await startDatabase();
  });
  afterAll(async () => {
    await stopDatabase();
  });

  // --- Migration20260626000002_jet_types: table + seed ---

  it('seeds exactly 3 jet_types rows with the fixed UUIDs (spec: Jet Type Catalog)', async () => {
    const em = getEm() as unknown as RawSql;
    const rows = (await em.execute(
      `select id, name, max_speed, cruise_speed, acceleration_rate, defense, damage, rotation_speed,
              lock_delay, radar_range, radar_angle, missile_speed, missile_turn_rate, missile_lifetime, missile_damage
       from jet_types order by name`,
    )) as Array<{
      id: string;
      name: string;
      max_speed: string;
      cruise_speed: string;
      acceleration_rate: string;
      defense: string;
      damage: string;
      rotation_speed: string;
      lock_delay: string;
      radar_range: string;
      radar_angle: string;
      missile_speed: string;
      missile_turn_rate: string;
      missile_lifetime: string;
      missile_damage: string;
    }>;

    expect(rows).toHaveLength(3);

    const byName = new Map(rows.map((r) => [r.name, r]));

    const interceptor = byName.get('Interceptor');
    expect(interceptor).toBeDefined();
    expect(interceptor!.id).toBe(INTERCEPTOR_ID);
    expect(Number(interceptor!.max_speed)).toBe(460);
    expect(Number(interceptor!.cruise_speed)).toBe(200);
    expect(Number(interceptor!.acceleration_rate)).toBeCloseTo(4.0, 5);
    expect(Number(interceptor!.defense)).toBe(10);
    expect(Number(interceptor!.damage)).toBe(30);
    expect(Number(interceptor!.rotation_speed)).toBeCloseTo(6.0, 5);
    expect(Number(interceptor!.lock_delay)).toBe(400);
    expect(Number(interceptor!.radar_range)).toBe(550);
    expect(Number(interceptor!.radar_angle)).toBe(25);
    expect(Number(interceptor!.missile_speed)).toBe(380);
    expect(Number(interceptor!.missile_turn_rate)).toBeCloseTo(5.0, 5);
    expect(Number(interceptor!.missile_lifetime)).toBe(2500);
    expect(Number(interceptor!.missile_damage)).toBe(60);

    const balanced = byName.get('Balanced');
    expect(balanced).toBeDefined();
    expect(balanced!.id).toBe(BALANCED_ID);
    expect(Number(balanced!.max_speed)).toBe(360);
    expect(Number(balanced!.acceleration_rate)).toBeCloseTo(5.0, 5);
    expect(Number(balanced!.defense)).toBe(35);
    expect(Number(balanced!.damage)).toBe(45);
    expect(Number(balanced!.rotation_speed)).toBeCloseTo(4.5, 5);
    expect(Number(balanced!.lock_delay)).toBe(600);
    expect(Number(balanced!.radar_range)).toBe(500);
    expect(Number(balanced!.radar_angle)).toBe(30);
    expect(Number(balanced!.missile_speed)).toBe(350);
    expect(Number(balanced!.missile_turn_rate)).toBeCloseTo(4.0, 5);
    expect(Number(balanced!.missile_lifetime)).toBe(3000);
    expect(Number(balanced!.missile_damage)).toBe(75);

    const heavy = byName.get('Heavy');
    expect(heavy).toBeDefined();
    expect(heavy!.id).toBe(HEAVY_ID);
    expect(Number(heavy!.max_speed)).toBe(280);
    expect(Number(heavy!.cruise_speed)).toBe(180);
    expect(Number(heavy!.acceleration_rate)).toBeCloseTo(6.0, 5);
    expect(Number(heavy!.defense)).toBe(60);
    expect(Number(heavy!.damage)).toBe(80);
    expect(Number(heavy!.rotation_speed)).toBeCloseTo(3.0, 5);
    expect(Number(heavy!.lock_delay)).toBe(1000);
    expect(Number(heavy!.radar_range)).toBe(450);
    expect(Number(heavy!.radar_angle)).toBe(35);
    expect(Number(heavy!.missile_speed)).toBe(300);
    expect(Number(heavy!.missile_turn_rate)).toBeCloseTo(3.0, 5);
    expect(Number(heavy!.missile_lifetime)).toBe(3500);
    expect(Number(heavy!.missile_damage)).toBe(90);
  });

  it('JetTypeRepositoryAdapter.findAll maps the 3 seeded rows to domain aggregates', async () => {
    const repo = new JetTypeRepositoryAdapter(getEm());
    const jetTypes = await repo.findAll();
    expect(jetTypes).toHaveLength(3);

    const byName = new Map(jetTypes.map((j) => [j.name, j]));
    expect(byName.get('Interceptor')!.id).toBe(INTERCEPTOR_ID);
    expect(byName.get('Interceptor')!.maxSpeed.value).toBe(460);
    expect(byName.get('Interceptor')!.lockDelay.value).toBe(400);
    expect(byName.get('Interceptor')!.radarAngle.value).toBe(25);
    expect(byName.get('Interceptor')!.missileDamage.value).toBe(60);
    expect(byName.get('Balanced')!.id).toBe(BALANCED_ID);
    expect(byName.get('Balanced')!.defense.value).toBe(35);
    expect(byName.get('Balanced')!.lockDelay.value).toBe(600);
    expect(byName.get('Balanced')!.missileSpeed.value).toBe(350);
    expect(byName.get('Heavy')!.id).toBe(HEAVY_ID);
    expect(byName.get('Heavy')!.damage.value).toBe(80);
    expect(byName.get('Heavy')!.missileLifetime.value).toBe(3500);
    expect(byName.get('Heavy')!.missileTurnRate.value).toBe(3.0);
  });

  it('JetTypeExists (adapter.exists) returns true for known ids and false for unknown', async () => {
    const adapter = new JetTypeRepositoryAdapter(getEm());
    expect(await adapter.exists(INTERCEPTOR_ID)).toBe(true);
    expect(await adapter.exists(BALANCED_ID)).toBe(true);
    expect(await adapter.exists(HEAVY_ID)).toBe(true);
    expect(await adapter.exists(UNKNOWN_ID)).toBe(false);
  });

  it('JetTypesController.list() returns the 3 types (controller → usecase → adapter → DB)', async () => {
    // Wire the controller with the real adapter against the testcontainer EM.
    // The @Public no-auth surface is unit-tested in auth-guard.spec.ts; this
    // spec proves the catalog pipeline returns the 3 types with full stats.
    const adapter = new JetTypeRepositoryAdapter(getEm());
    const listJetTypes = new ListJetTypes(adapter);
    const controller = new JetTypesController(listJetTypes);

    const dto = await controller.list();

    expect(dto).toHaveLength(3);
    const byName = new Map(dto.map((j) => [j.name, j]));
    expect(byName.get('Interceptor')!.id).toBe(INTERCEPTOR_ID);
    expect(byName.get('Interceptor')!.maxSpeed).toBe(460);
    expect(byName.get('Interceptor')!.accelerationRate).toBeCloseTo(4.0, 5);
    expect(byName.get('Interceptor')!.rotationSpeed).toBeCloseTo(6.0, 5);
    expect(byName.get('Interceptor')!.lockDelay).toBe(400);
    expect(byName.get('Interceptor')!.radarRange).toBe(550);
    expect(byName.get('Interceptor')!.radarAngle).toBe(25);
    expect(byName.get('Interceptor')!.missileSpeed).toBe(380);
    expect(byName.get('Interceptor')!.missileTurnRate).toBeCloseTo(5.0, 5);
    expect(byName.get('Interceptor')!.missileLifetime).toBe(2500);
    expect(byName.get('Interceptor')!.missileDamage).toBe(60);
    expect(byName.get('Balanced')!.id).toBe(BALANCED_ID);
    expect(byName.get('Balanced')!.rotationSpeed).toBeCloseTo(4.5, 5);
    expect(byName.get('Balanced')!.lockDelay).toBe(600);
    expect(byName.get('Balanced')!.radarRange).toBe(500);
    expect(byName.get('Balanced')!.radarAngle).toBe(30);
    expect(byName.get('Balanced')!.missileSpeed).toBe(350);
    expect(byName.get('Balanced')!.missileTurnRate).toBeCloseTo(4.0, 5);
    expect(byName.get('Balanced')!.missileLifetime).toBe(3000);
    expect(byName.get('Balanced')!.missileDamage).toBe(75);
    expect(byName.get('Heavy')!.damage).toBe(80);
    expect(byName.get('Heavy')!.rotationSpeed).toBeCloseTo(3.0, 5);
    expect(byName.get('Heavy')!.lockDelay).toBe(1000);
    expect(byName.get('Heavy')!.radarRange).toBe(450);
    expect(byName.get('Heavy')!.radarAngle).toBe(35);
    expect(byName.get('Heavy')!.missileSpeed).toBe(300);
    expect(byName.get('Heavy')!.missileTurnRate).toBeCloseTo(3.0, 5);
    expect(byName.get('Heavy')!.missileLifetime).toBe(3500);
    expect(byName.get('Heavy')!.missileDamage).toBe(90);
  });

  // --- Migration20260626000003_game_records_jet_type_fk: column + FK + default ---

  it('game_records.jet_type_id is NOT NULL with a column-level default = Balanced UUID', async () => {
    const em = getEm() as unknown as RawSql;
    const rows = (await em.execute(
      `select is_nullable, column_default
       from information_schema.columns
       where table_name = 'game_records' and column_name = 'jet_type_id'`,
    )) as Array<{ is_nullable: string; column_default: string | null }>;

    expect(rows).toHaveLength(1);
    expect(rows[0].is_nullable).toBe('NO'); // NOT NULL
    // The default expression embeds the Balanced UUID as a string literal.
    expect(rows[0].column_default).toContain(BALANCED_ID);
  });

  it('inserting a game_record without jet_type_id backfills to the Balanced UUID via the DEFAULT', async () => {
    const em = getEm() as unknown as RawSql;
    // Insert with an explicit id + user + score + duration + timestamp but NO
    // jet_type_id → the DB-level DEFAULT kicks in (design Decision #7). Use
    // `?` placeholders — MikroORM's em.execute delegates to knex-style binding.
    const userId = '00000000-0000-4000-8000-000000000099';
    const recId = '00000000-0000-4000-8000-0000000000a1';
    await em.execute(
      `insert into game_records (id, user_id, score, duration_ms, timestamp)
       values (?, ?, 0, 1000, now())`,
      [recId, userId],
    );

    const rows = (await em.execute(
      `select jet_type_id from game_records where id = ?`,
      [recId],
    )) as Array<{ jet_type_id: string }>;
    expect(rows[0].jet_type_id).toBe(BALANCED_ID);

    // Cleanup so the FK seed row count assertions in other tests stay tidy.
    await em.execute(`delete from game_records where id = ?`, [recId]);
  });

  it('inserting a game_record with a non-existent jet_type_id raises an FK violation (storage backstop)', async () => {
    const em = getEm() as unknown as RawSql;
    const userId = '00000000-0000-4000-8000-000000000098';
    const recId = '00000000-0000-4000-8000-0000000000b2';
    // Postgres raises SQLSTATE 23503 (foreign_key_violation). The clean path
    // is the 422 ValidationError from PersistGameRecord's JetTypeExists check
    // (task 7.2) — this proves the storage backstop also rejects bad ids.
    await expect(
      em.execute(
        `insert into game_records (id, user_id, jet_type_id, score, duration_ms, timestamp)
         values (?, ?, ?, 0, 1000, now())`,
        [recId, userId, UNKNOWN_ID],
      ),
    ).rejects.toThrow();

    // Cleanup any partial state (should not exist, but be safe).
    await em.execute(`delete from game_records where id = ?`, [recId]).catch(() => undefined);
  });

  it('the FK constraint game_records_jet_type_id_fkey exists on the table', async () => {
    const em = getEm() as unknown as RawSql;
    const rows = (await em.execute(
      `select constraint_name
       from information_schema.table_constraints
       where table_name = 'game_records' and constraint_type = 'FOREIGN KEY'
       and constraint_name = 'game_records_jet_type_id_fkey'`,
    )) as Array<{ constraint_name: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].constraint_name).toBe('game_records_jet_type_id_fkey');
  });
});