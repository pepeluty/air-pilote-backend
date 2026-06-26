import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { defineConfig } from '@mikro-orm/postgresql';

/**
 * Root AppModule.
 *
 * Wires MikroORM (PostgreSQL) from environment variables. Context modules
 * (identity, game-records) will be imported here in later PRs (PR 3, PR 4).
 * The global AuthGuard (APP_GUARD) and DomainExceptionFilter are registered
 * in task 1.4.
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
        entities: ['./dist/contexts/**/*.entity.js'],
        entitiesTs: ['./src/contexts/**/*.entity.ts'],
        migrations: {
          path: './dist/migrations',
          pathTs: './src/migrations',
        },
      }),
    ),
  ],
})
export class AppModule {}