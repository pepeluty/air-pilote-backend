import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { defineConfig } from '@mikro-orm/postgresql';
import { AuthGuard } from './shared/AuthGuard';
import { TOKEN_VERIFIER, TokenVerifier } from './shared/TokenVerifier.port';
import { USER_EXISTS, UserExists } from './shared/UserExists.port';

/**
 * Placeholder providers for the shared-kernel ports.
 *
 * PR 2 ships the ports + the global AuthGuard before the identity context
 * exists (PR 3). NestJS DI would fail to resolve `USER_EXISTS` / `TOKEN_VERIFIER`
 * at bootstrap without a binding, so these stubs satisfy the container. They
 * throw on use — nothing calls them yet because no controller is wired in
 * PR 2. PR 3's identity module overrides both with real adapters (JWT
 * TokenVerifier + UserExists read-model backed by MikroORM).
 */
function notImplemented(port: string): never {
  throw new Error(
    `${port} not implemented — provided by the identity context (PR 3).`,
  );
}

const USER_EXISTS_STUB: UserExists = {
  exists: () => notImplemented('UserExists'),
};

const TOKEN_VERIFIER_STUB: TokenVerifier = {
  verifyAccess: () => notImplemented('TokenVerifier'),
};

/**
 * Root AppModule.
 *
 * Wires MikroORM (PostgreSQL) from environment variables. Context modules
 * (identity, game-records) will be imported here in later PRs (PR 3, PR 4).
 * The global AuthGuard (APP_GUARD) is registered here so EVERY endpoint passes
 * through the token + UserExists chokepoint (design Decision #5, CRITICAL).
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
  providers: [
    { provide: USER_EXISTS, useValue: USER_EXISTS_STUB },
    { provide: TOKEN_VERIFIER, useValue: TOKEN_VERIFIER_STUB },
    AuthGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}