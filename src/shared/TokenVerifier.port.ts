/**
 * TokenVerifier — access-token verification port.
 *
 * Implemented by the identity context's infrastructure layer (JWT adapter) in
 * PR 3. Lives in the shared kernel so the global AuthGuard can verify tokens
 * before the identity context exists — the guard depends on the port, not the
 * adapter. Throws on invalid/expired tokens; the AuthGuard translates that into
 * an {@link UnauthenticatedError}.
 *
 * Shared kernel: framework-agnostic (pure TS). NestJS DI token exported below.
 */

import type { Port } from './application/Port';

/** NestJS injection token for the TokenVerifier port. */
export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

/**
 * Verify an access token and return its subject. Throws on any verification
 * failure (bad signature, expired, malformed) — callers are expected to catch
 * and map to {@link UnauthenticatedError}.
 */
export interface TokenVerifier extends Port {
  /** @returns the userId encoded in the token. */
  verifyAccess(token: string): { userId: string };
}
