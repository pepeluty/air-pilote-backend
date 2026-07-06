/**
 * RefreshTokenStore — outbound port for refresh-token persistence + per-user
 * locking (design Decision #4 + Warning W4 try/finally lock).
 *
 * The store owns: issuance (generate token+hash, persist an `issued` row),
 * lookup by hash, rotation (mark a row `rotated` with its superseding hash),
 * family-wide revocation (mark every row in a family `revoked`), and a
 * per-user lock serializing rotations. Application layer: framework-agnostic.
 *
 * The interface matches the design Interfaces/Contracts section EXACTLY (no
 * additive methods). Token generation/hash derivation lives on
 * {@link TokenSigner}; the adapter wires the two together (calling
 * `signRefresh` inside `issue`).
 */
import type { Port } from '@shared/application/Port';
import type { LockHandle, RefreshTokenRow } from './types';

export interface RefreshTokenStore extends Port {
  /**
   * Generate a new refresh token, persist an `issued` row for it, and return
   * the raw token (for the cookie) plus its hash and the persisted row.
   * `parentHash` is `null` for a family root (register/login) and the previous
   * token's hash for a rotation.
   */
  issue(
    userId: string,
    familyId: string,
    parentHash: string | null,
  ): Promise<{ token: string; hash: string; row: RefreshTokenRow }>;

  /** Look up a row by its storage hash, or `null` when none is stored. */
  findByHash(hash: string): Promise<RefreshTokenRow | null>;

  /** Transition a row to `rotated` and record its superseding hash. */
  markRotated(id: string, newHash: string): Promise<void>;

  /** Transition every row in `familyId` to `revoked` (terminal). */
  revokeFamily(familyId: string): Promise<void>;

  /**
   * Acquire the per-user rotation lock. Callers MUST release it in a `finally`
   * block (design Warning W4). MVP uses an in-memory lock (design Open Question
   * — Postgres advisory lock is the documented scale path).
   */
  acquireLock(userId: string): Promise<LockHandle>;

  /** Release a previously acquired lock. Idempotent. */
  releaseLock(handle: LockHandle): Promise<void>;
}
