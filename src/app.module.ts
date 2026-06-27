import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { defineConfig, UnderscoreNamingStrategy } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { IdentityModule } from './contexts/identity/infrastructure/nest-identity.module';
import { GameRecordsModule } from './contexts/game-records/infrastructure/nest-game-records.module';
import { AuthGuard } from './shared/AuthGuard';

/**
 * Root AppModule.
 *
 * Wires MikroORM (PostgreSQL) from environment variables and imports the
 * identity context module (PR 3), which provides the real USER_EXISTS +
 * TOKEN_VERIFIER bindings exported for the global AuthGuard. The PR 2
 * placeholder stubs for those ports have been removed — the identity module's
 * bindings now satisfy the AuthGuard's constructor injection (design Decision
 * #5, CRITICAL). The global AuthGuard (APP_GUARD) is registered here so EVERY
 * endpoint passes through the token + UserExists chokepoint.
 *
 * Migrations live in `src/migrations` (compiled to `dist/migrations`); the
 * Migrator extension is registered so `mikro-orm migration:up` works. Column
 * names follow snake_case via UnderscoreNamingStrategy.
 */
@Module({
  imports: [
    MikroOrmModule.forRoot(
      defineConfig({
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
          tableName: 'mikro_orm_migrations',
        },
        extensions: [Migrator],
      }),
    ),
    IdentityModule,
    GameRecordsModule,
  ],
  providers: [AuthGuard, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
