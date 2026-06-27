/**
 * Test DB harness — spins up PostgreSQL in a testcontainer, boots MikroORM
 * against it (with the real identity + game-records entities and the
 * UnderscoreNamingStrategy), and creates the schema from the entities via the
 * SchemaGenerator. Each jest worker loads this module once, so one spec file =
 * one container. Exposes a fresh request context (`getEm`) for clean
 * identity-maps per test.
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

type StartedContainer = Awaited<ReturnType<GenericContainer['start']>>;

let orm: MikroORM | undefined;
let container: StartedContainer | undefined;

const ENTITIES = [UserEntity, RefreshTokenEntity, GameRecordEntity];

/**
 * Start Postgres + boot MikroORM + create the schema. Idempotent per worker.
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
    }),
  );

  await orm.schema.createSchema();
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