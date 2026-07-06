/**
 * IdentityModule — NestJS DynamicModule wiring the identity context
 * (design Decision #5: replaces PR 2's placeholder USER_EXISTS / TOKEN_VERIFIER
 * stubs with real adapters).
 *
 * Wiring:
 *   - MikroORM feature: UserEntity + RefreshTokenEntity registered so the
 *     EntityManager resolves the identity tables.
 *   - Adapters: UserRepositoryAdapter (also the UserExists read-model),
 *     RefreshTokenStoreAdapter (in-memory per-user lock), JwtTokenSigner (also
 *     the shared TokenVerifier), Argon2PasswordHasher.
 *   - Shared-kernel port bindings: { provide: USER_EXISTS, useExisting:
 *     UserRepositoryAdapter }, { provide: TOKEN_VERIFIER, useExisting:
 *     JwtTokenSigner } — these OVERRIDE the PR 2 AppModule stubs and are
 *     exported so the global AuthGuard (registered in AppModule) resolves real
 *     implementations.
 *   - Use cases: the application use cases are framework-agnostic plain TS
 *     classes (no @nestjs decorators, no @Inject — layer-guard clean). They are
 *     instantiated here via `useFactory` with their port dependencies injected
 *     by concrete adapter class token, then exposed by class token so the
 *     AuthController can inject them.
 *
 * Infrastructure layer: framework allowed (NestJS + MikroORM).
 */
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TOKEN_VERIFIER } from '@shared/TokenVerifier.port';
import { USER_EXISTS } from '@shared/UserExists.port';
import { LoginUser } from '../application/usecases/LoginUser';
import { Logout } from '../application/usecases/Logout';
import { RefreshToken } from '../application/usecases/RefreshToken';
import { RegisterUser } from '../application/usecases/RegisterUser';
import { Argon2PasswordHasher } from './crypto/Argon2PasswordHasher';
import { AuthController } from './controllers/AuthController';
import { JwtTokenSigner } from './jwt/JwtTokenSigner';
import {
  DEFAULT_REFRESH_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  RefreshTokenStoreAdapter,
} from './persistence/RefreshTokenStoreAdapter';
import { RefreshTokenEntity } from './persistence/RefreshTokenEntity';
import { UserEntity } from './persistence/UserEntity';
import { UserRepositoryAdapter } from './persistence/UserRepositoryAdapter';

@Module({
  imports: [MikroOrmModule.forFeature([UserEntity, RefreshTokenEntity])],
  controllers: [AuthController],
  providers: [
    // --- adapters ---
    UserRepositoryAdapter,
    RefreshTokenStoreAdapter,
    JwtTokenSigner,
    Argon2PasswordHasher,
    {
      provide: REFRESH_TOKEN_TTL_MS,
      useValue: Number(process.env.REFRESH_TOKEN_TTL_MS ?? DEFAULT_REFRESH_TTL_MS),
    },

    // --- shared-kernel port bindings (override PR 2 AppModule stubs) ---
    { provide: USER_EXISTS, useExisting: UserRepositoryAdapter },
    { provide: TOKEN_VERIFIER, useExisting: JwtTokenSigner },

    // --- use cases (plain TS classes, instantiated with port deps) ---
    {
      provide: RegisterUser,
      useFactory: (users, hasher, tokens, refreshStore) =>
        new RegisterUser(users, hasher, tokens, refreshStore),
      inject: [
        UserRepositoryAdapter,
        Argon2PasswordHasher,
        JwtTokenSigner,
        RefreshTokenStoreAdapter,
      ],
    },
    {
      provide: LoginUser,
      useFactory: (users, hasher, tokens, refreshStore) =>
        new LoginUser(users, hasher, tokens, refreshStore),
      inject: [
        UserRepositoryAdapter,
        Argon2PasswordHasher,
        JwtTokenSigner,
        RefreshTokenStoreAdapter,
      ],
    },
    {
      provide: RefreshToken,
      useFactory: (tokens, refreshStore) => new RefreshToken(tokens, refreshStore),
      inject: [JwtTokenSigner, RefreshTokenStoreAdapter],
    },
    {
      provide: Logout,
      useFactory: (tokens, refreshStore) => new Logout(tokens, refreshStore),
      inject: [JwtTokenSigner, RefreshTokenStoreAdapter],
    },
  ],
  exports: [USER_EXISTS, TOKEN_VERIFIER],
})
export class IdentityModule {}
