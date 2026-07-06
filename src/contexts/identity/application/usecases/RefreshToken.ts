/**
 * RefreshToken — rotate a refresh token with family-reuse detection
 * (spec: Refresh Token Rotation; design Decision #4 + data flow (b)).
 *
 * State machine (design W1 — statuses EXACTLY `issued | rotated | revoked`;
 * reuse is a TRIGGER, not a status):
 *
 *   issued --rotate--> rotated --(reuse of any descendant)--> revoked
 *   issued --(reuse)--> revoked
 *
 * The DECISION of which transition to apply based on the presented row's
 * `status` lives HERE, in the use case (design W3 — NOT in the port). Valid-
 * transition enforcement lives on the domain {@link RefreshToken} entity and is
 * applied by the store adapter when it mutates rows.
 *
 * Locking (design Warning W4 — try/finally lock is mandatory): the per-user
 * rotation lock is acquired BEFORE the authoritative lookup and released in a
 * `finally` block on every path. Because the refresh token is opaque (carries
 * no userId), the userId is resolved from the stored row. A double-check is
 * used: a provisional unlocked `findByHash` resolves the userId for the lock,
 * then the row is re-confirmed UNDER the lock before any decision/mutation —
 * the unlocked lookup is read-only and only fetches the lock key; the
 * authoritative branch + mutation happen inside the critical section. This is a
 * refinement of the design's "acquire lock first" sketch (which assumed the
 * token carried a userId) and is flagged in the apply-progress deviation list.
 *
 * Flow:
 *   hash       = tokens.hashOf(R)
 *   provisional = store.findByHash(hash)        // unlocked — get userId
 *     null | expired -> InvalidCredentialsError (401, no lock)
 *   lock       = store.acquireLock(provisional.userId)
 *   try {
 *     row = store.findByHash(hash)              // re-confirm under lock
 *       null | expired          -> InvalidCredentialsError (401)
 *       status === 'issued'     -> markRotated(row.id, newHash); issue new pair
 *                                     (same familyId, parent=row.hash); return
 *       status === 'rotated'    -> REUSE: revokeFamily(row.familyId);
 *                                     InvalidCredentialsError (401, no tokens)
 *       status === 'revoked'    -> InvalidCredentialsError (401, no tokens)
 *   } finally { store.releaseLock(lock) }
 *
 * Application layer: framework-agnostic — depends only on ports + domain.
 */
import { UseCase } from '@shared/application/UseCase';
import { InvalidCredentialsError } from '@shared/errors';
import { AuthToken } from '../../domain/vo/AuthToken';
import { RefreshTokenStore } from '../ports/RefreshTokenStore.port';
import { TokenSigner } from '../ports/TokenSigner.port';

export interface RefreshTokenCommand {
  readonly refreshToken: string;
}

export class RefreshToken extends UseCase<RefreshTokenCommand, AuthToken> {
  constructor(
    private readonly tokens: TokenSigner,
    private readonly refreshStore: RefreshTokenStore,
  ) {
    super();
  }

  async execute(command: RefreshTokenCommand): Promise<AuthToken> {
    const hash = this.tokens.hashOf(command.refreshToken);

    // (1) Provisional unlocked lookup to resolve the userId for the per-user
    // lock. A missing/expired token is rejected before any lock is acquired —
    // no `finally` is needed on this path.
    const provisional = await this.refreshStore.findByHash(hash);
    if (provisional === null) {
      throw new InvalidCredentialsError('refresh_token_not_found');
    }
    if (provisional.expiresAt.getTime() <= Date.now()) {
      throw new InvalidCredentialsError('refresh_token_expired');
    }

    // (2) Acquire the per-user rotation lock. EVERY subsequent path releases it
    // in the `finally` block below (design Warning W4).
    const lock = await this.refreshStore.acquireLock(provisional.userId);
    try {
      // (3) Re-confirm the row UNDER the lock before deciding/mutating.
      const row = await this.refreshStore.findByHash(hash);
      if (row === null) {
        throw new InvalidCredentialsError('refresh_token_not_found');
      }
      if (row.expiresAt.getTime() <= Date.now()) {
        throw new InvalidCredentialsError('refresh_token_expired');
      }
      // (4) Branch on the persisted status (EXACTLY issued | rotated | revoked).
      if (row.status === 'issued') {
        return this.rotate(row.userId, row.familyId, row.id, row.hash);
      }
      if (row.status === 'rotated') {
        // REUSE DETECTED — revoke the entire family (R, R2, ... -> revoked).
        await this.refreshStore.revokeFamily(row.familyId);
        throw new InvalidCredentialsError('refresh_token_reuse_detected');
      }
      // status === 'revoked' — the family was already burnt (logout, earlier
      // reuse, or a deleted account). Reject without re-revoking.
      throw new InvalidCredentialsError('refresh_token_revoked');
    } finally {
      await this.refreshStore.releaseLock(lock);
    }
  }

  /**
   * Happy path: mark the presented row `rotated` with the new hash, then issue a
   * fresh access + refresh pair in the SAME family with the presented row's
   * hash as the parent (design (b): "issue pair (same familyId, parent=R)").
   */
  private async rotate(
    userId: string,
    familyId: string,
    presentedId: string,
    presentedHash: string,
  ): Promise<AuthToken> {
    const accessToken = this.tokens.signAccess({ userId });
    const issued = await this.refreshStore.issue(
      userId,
      familyId,
      presentedHash,
    );
    await this.refreshStore.markRotated(presentedId, issued.hash);
    return AuthToken.create(accessToken, issued.token);
  }
}
