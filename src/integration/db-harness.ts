/**
 * Test DB harness — spins up PostgreSQL in a testcontainer, boots MikroORM
 * against it (with the real identity + game-records + jet-types entities and
 * the UnderscoreNamingStrategy), and runs ALL migrations via the Migrator
 * (creating the schema AND seeding the jet_types rows with the fixed UUIDs —
 * which the jet-types integration spec asserts, task 7.3). Each jest worker
 * loads this module once, so one spec file = one container. Exposes a fresh
 * request context (`getEm`) for clean identity-maps per test.
 *
 * Infrastructure-layer test helper: framework allowed (@mikro-orm/@nestjs +
 * testcontainers). NOT shipped in the prod build — `src/integration` is excluded
 * from the main tsconfig and only compiled/linted via tsconfig.spec.json.
 */
import { MikroORM } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { GenericContainer, Wait } from 'testcontainers';
import { EntityManager, UnderscoreNamingStrategy, defineConfig } from '@mikro-orm/postgresql';
import { UserEntity } from '../contexts/identity/infrastructure/persistence/UserEntity';
import { RefreshTokenEntity } from '../contexts/identity/infrastructure/persistence/RefreshTokenEntity';
import { GameRecordEntity } from '../contexts/game-records/infrastructure/persistence/GameRecordEntity';
import { JetTypeEntity } from '../contexts/jet-types/infrastructure/persistence/JetTypeEntity';

type StartedContainer = Awaited<ReturnType<GenericContainer['start']>>;

let orm: MikroORM | undefined;
let container: StartedContainer | undefined;

const ENTITIES = [UserEntity, RefreshTokenEntity, GameRecordEntity, JetTypeEntity];

/**
 * Start Postgres + boot MikroORM + run ALL migrations (creates the schema AND
 * seeds the jet_types rows with the fixed UUIDs so the FK default on
 * game_records.jet_type_id resolves). Idempotent per worker.
 */
export async function startDatabase(): Promise<MikroORM> {
  if (orm) return orm;

  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({ POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test', POSTGRES_DB: 'airpilote' })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();

  orm = await MikroORM.init(
    defineConfig({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      dbName: 'airpilote',
      user: 'test',
      password: 'test',
      entities: ENTITIES,
      namingStrategy: UnderscoreNamingStrategy,
      allowGlobalContext: true,
      extensions: [Migrator],
      migrations: {
        path: './src/migrations',
        pathTs: './src/migrations',
        glob: '!(*.d).ts',
        transactional: true,
        allOrNothing: true,
      },
    }),
  );

  // Drop any entity-derived schema first (a no-op on a fresh container) then
  // run all migrations in filename order: 00000000_initial, 00000001_game_records,
  // 00000002_jet_types (seed), 00000003_game_records_jet_type_fk. This is the
  // real rollout path the jet-types integration spec asserts against.
  await orm.schema.dropSchema();
  await orm.migrator.up();
  return orm;
}

/** Fork the global EntityManager for a single test (clean identity map). */
export function getEm(): EntityManager {
  if (!orm) throw new Error('call startDatabase() first');
  // `orm.em.fork()` returns the runtime SqlEntityManager (Postgres driver);
  // cast to the postgres-flavored EntityManager the adapters expect.
  return orm.em.fork() as unknown as EntityManager;
}

/** Tear the ORM + container down (afterAll). */
export async function stopDatabase(): Promise<void> {
  if (orm) {
    await orm.close();
    orm = undefined;
  }
  if (container) {
    await container.stop();
    container = undefined;
  }
}