/**
 * AuthGuard unit tests (task 4.3; spec backend-game-records "Authentication
 * Enforcement" + design Decision #5 CRITICAL).
 *
 * The global AuthGuard is injected with TokenVerifier + UserExists ports. We
 * build a fake NestJS ExecutionContext in-memory (no HTTP server) and assert
 * every branch:
 *   - valid token + existing user -> allows (returns true)
 *   - valid token + DELETED user -> NonExistentUserError (CRITICAL — no FK 500)
 *   - foreign/expired token (verifyAccess throws) -> UnauthenticatedError
 *   - no token at all -> UnauthenticatedError
 *   - @Public route -> allowed without a token
 */
import { ExecutionContext } from '@nestjs/common';
import { NonExistentUserError, UnauthenticatedError } from '@shared/errors';
import { AuthGuard, IS_PUBLIC_KEY, Public } from '../AuthGuard';
import type { TokenVerifier } from '../TokenVerifier.port';
import type { UserExists } from '../UserExists.port';

class FakeTokenVerifier implements TokenVerifier {
  constructor(private readonly users: Record<string, string>) {}
  verifyAccess(token: string): { userId: string } {
    const userId = this.users[token];
    if (!userId) throw new Error('foreign-or-expired'); // mimic jwt.verify failure
    return { userId };
  }
}

class FakeUserExists implements UserExists {
  constructor(private readonly existing: Set<string>) {}
  async exists(userId: string): Promise<boolean> {
    return this.existing.has(userId);
  }
}

/** Minimal ExecutionContext stub: a class + handler with metadata + an HTTP request. */
function makeContext(
  request: Record<string, unknown>,
  _handlerMeta: Record<symbol, unknown> = {},
  classRef: object = function DummyHandler() {},
  handler: object = function () {},
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => classRef as never,
  } as unknown as ExecutionContext;
}

function makeGuard(existing: Set<string>, tokenMap: Record<string, string>): AuthGuard {
  return new AuthGuard(
    new FakeTokenVerifier(tokenMap) as unknown as TokenVerifier,
    new FakeUserExists(existing) as unknown as UserExists,
  );
}

describe('AuthGuard (global, design Decision #5 CRITICAL)', () => {
  it('allows a valid token whose user still exists', async () => {
    const existing = new Set(['user-ok']);
    const guard = makeGuard(existing, { 'tok-ok': 'user-ok' });
    const ctx = makeContext({ headers: { authorization: 'Bearer tok-ok' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toEqual({ userId: 'user-ok' });
  });

  it('rejects a valid token for a DELETED user with NonExistentUserError (CRITICAL)', async () => {
    const existing = new Set<string>(); // user deleted — not in existence set
    const guard = makeGuard(existing, { 'tok-deleted': 'user-gone' });
    const ctx = makeContext({ headers: { authorization: 'Bearer tok-deleted' } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(NonExistentUserError);
  });

  it('rejects a foreign/expired token (verifyAccess throws) with UnauthenticatedError', async () => {
    const guard = makeGuard(new Set(['user-ok']), { 'tok-ok': 'user-ok' });
    // 'tok-foreign' is NOT in the token map -> FakeTokenVerifier throws.
    const ctx = makeContext({ headers: { authorization: 'Bearer tok-foreign' } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('rejects a request with no token at all with UnauthenticatedError', async () => {
    const guard = makeGuard(new Set(['user-ok']), { 'tok-ok': 'user-ok' });
    const ctx = makeContext({ headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('also reads the access token from the httpOnly cookie when no Bearer header', async () => {
    const existing = new Set(['user-cookie']);
    const guard = makeGuard(existing, { 'cookie-tok': 'user-cookie' });
    const ctx = makeContext({ headers: {}, cookies: { access_token: 'cookie-tok' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('allows a @Public route without any token', async () => {
    const guard = makeGuard(new Set(), {});
    const routeHandler = function publicRoute() {};
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, routeHandler);
    const ctx = makeContext({ headers: {} }, {}, function PublicCtrl() {}, routeHandler);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('the Public() decorator stamps IS_PUBLIC metadata on the handler value', () => {
    const routeHandler = function decorated() {};
    const descriptor = { value: routeHandler, writable: true, enumerable: false, configurable: true };
    // Simulate a method decorator application: Public()(target, key, descriptor).
    Public()({} as object, 'decorated', descriptor as PropertyDescriptor);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, routeHandler)).toBe(true);
  });
});