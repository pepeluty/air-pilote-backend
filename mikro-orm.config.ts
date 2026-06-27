import { defineConfig, UnderscoreNamingStrategy } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

/**
 * Standalone MikroORM config for CLI usage (migrations, schema, etc).
 *
 * The runtime config lives in `src/app.module.ts` (wired via MikroOrmModule.forRoot).
 * This file mirrors the same settings so the `mikro-orm` CLI binary can resolve
 * the connection without bootstrapping the full NestJS application.
 *
 * Usage:
 *   npx mikro-orm migration:up        # apply pending migrations
 *   npx mikro-orm migration:down      # revert last migration
 *   npx mikro-orm migration:list     # show migration status
 *   npx mikro-orm migration:create    # create a new migration from entity changes
 */
export default defineConfig({
  host: process.env.PG_HOST ?? 'localhost',
  port: Number(process.env.PG_PORT ?? 5432),
  dbName: process.env.PG_DB ?? 'air-pilote',
  user: process.env.PG_USER ?? 'postgres',
  password: process.env.PG_PASSWORD ?? 'postgres',
  entities: ['./dist/contexts/**/*Entity.js'],
  entitiesTs: ['./src/contexts/**/*Entity.ts'],
  namingStrategy: UnderscoreNamingStrategy,
  migrations: {
    path: './dist/migrations',
    pathTs: './src/migrations',
    tableName: 'mikro_orm_migrations', // migration log table
  },
  extensions: [Migrator],
});