/**
 * TokenSigner — outbound port for access/refresh token issuance and verification
 * (identity context). The JWT adapter also implements the shared
 * {@link TokenVerifier} port so the global AuthGuard can verify access tokens
 * through the shared kernel (design Decision #5/#6).
 *
 * Application layer: framework-agnostic — no @nestjs/@mikro-orm.
 *
 * NOTE — design refinement (single additive method): the design
 * Interfaces/Contracts section lists `signAccess`, `signRefresh`, and
 * `verifyAccess` with the exact signatures preserved below. The refresh flow
 * requires deriving the storage hash of a PRESENTED refresh token to look it up
 * via `RefreshTokenStore.findByHash(hash)`. Since `signRefresh` already owns
 * token+hash generation, the inverse `hashOf` is declared here so token
 * hashing stays in one port. The listed methods keep their exact signatures;
 * this is purely additive and is flagged in the apply-progress deviation list.
 *
 * The refresh token itself is an opaque random string (not a JWT): it carries
 * no user data, so the RefreshToken use case resolves the userId from the
 * stored row and uses a double-check lock (lookup -> acquireLock -> re-confirm
 * under lock) rather than decoding the token.
 */
import type { Port } from '@shared/application/Port';

export interface TokenSigner extends Port {
  /** Sign a short-lived access token for `userId` (Authorization header + cookie, Decision #6). */
  signAccess(payload: { userId: string }): string;
  /** Generate a fresh opaque refresh token plus its storage hash (httpOnly cookie). */
  signRefresh(): { token: string; hash: string };
  /** Verify an access token and return its subject. Throws on invalid/expired. */
  verifyAccess(token: string): { userId: string };
  /**
   * Deterministically derive the storage hash of a presented refresh token, so
   * callers can look it up via `RefreshTokenStore.findByHash`. Additive method —
   * see module note. MUST match the hash produced by {@link signRefresh}.
   */
  hashOf(token: string): string;
}
