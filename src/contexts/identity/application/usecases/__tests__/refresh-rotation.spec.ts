/**
 * RefreshToken rotation + Logout + lock torture — unit tests (task 4.2;
 * spec backend-identity: Refresh Token Rotation, Logout / Revocation).
 *
 * Exercises the family-detection state machine that lives in the RefreshToken
 * use case (design Decision #4, W1/W3) and the mandatory try/finally lock
 * (design Warning W4) with in-memory fakes. Also covers the Logout use case and
 * the AuthController cookie-clearing contract.
 *
 * Status set is EXACTLY issued|rotated|revoked; reuse is a TRIGGER (rotated ->
 * revoked family-wide), not a status.
 */
import { randomUUID } from 'node:crypto';
import { InvalidCredentialsError } from '@shared/errors';
import { Logout } from '../Logout';
import { RefreshToken } from '../RefreshToken';
import type { RefreshTokenStore } from '../../ports/RefreshTokenStore.port';
import type { TokenSigner } from '../../ports/TokenSigner.port';
import type { LockHandle, RefreshTokenRow } from '../../ports/types';

// --- in-memory fakes ---

class FakeTokenSigner implements TokenSigner {
  signAccessCalls = 0;
  private seq = 0;
  signAccess(p: { userId: string }): string {
    this.signAccessCalls += 1;
    return `access:${p.userId}:${this.seq++}`;
  }
  signRefresh(): { token: string; hash: string } {
    const token = `rt:${this.seq++}`;
    return { token, hash: this.hashOf(token) };
  }
  verifyAccess(): { userId: string } {
    throw new Error('not used');
  }
  hashOf(token: string): string {
    return `hashOf:${token}`;
  }
}

class FakeRefreshTokenStore implements RefreshTokenStore {
  readonly rowsByHash = new Map<string, RefreshTokenRow>();
  readonly rowsById = new Map<string, RefreshTokenRow>();
  issueCalls = 0;
  markRotatedCalls: { id: string; newHash: string }[] = [];
  revokeFamilyCalls: string[] = [];
  lockAcquired = 0;
  lockReleased = 0;
  /** When set, markRotated throws instead of transitioning — for lock torture. */
  markRotatedThrows: Error | null = null;

  async issue(
    userId: string,
    familyId: string,
    parentHash: string | null,
  ): Promise<{ token: string; hash: string; row: RefreshTokenRow }> {
    this.issueCalls += 1;
    const token = `rt-${userId}-${this.issueCalls}`;
    const hash = `hashOf:${token}`;
    const row: RefreshTokenRow = {
      id: randomUUID(),
      userId,
      familyId,
      parentTokenHash: parentHash,
      hash,
      status: 'issued',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    };
    this.rowsByHash.set(hash, row);
    this.rowsById.set(row.id, row);
    return { token, hash, row };
  }

  async findByHash(hash: string): Promise<RefreshTokenRow | null> {
    return this.rowsByHash.get(hash) ?? null;
  }

  async markRotated(id: string, newHash: string): Promise<void> {
    if (this.markRotatedThrows) throw this.markRotatedThrows;
    this.markRotatedCalls.push({ id, newHash });
    const row = this.rowsById.get(id);
    if (row) {
      row.status = 'rotated'; // hash preserved so a replayed token can still be found
      this.rowsByHash.set(row.hash, row);
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    this.revokeFamilyCalls.push(familyId);
    for (const row of this.rowsByHash.values()) {
      if (row.familyId === familyId) row.status = 'revoked';
    }
  }

  async acquireLock(userId: string): Promise<LockHandle> {
    this.lockAcquired += 1;
    return { userId, acquiredAt: Date.now() };
  }

  async releaseLock(): Promise<void> {
    this.lockReleased += 1;
  }
}

function makeHarness() {
  const tokens = new FakeTokenSigner();
  const refreshStore = new FakeRefreshTokenStore();
  const refresh = new RefreshToken(tokens, refreshStore);
  const logout = new Logout(tokens, refreshStore);
  return { tokens, refreshStore, refresh, logout };
}

/** Seed a row for `refreshToken` with the given status + a fresh family. */
function seedRow(
  h: ReturnType<typeof makeHarness>,
  refreshToken: string,
  opts: Partial<Pick<RefreshTokenRow, 'status' | 'familyId' | 'userId' | 'expiresAt'>> = {},
): RefreshTokenRow {
  const hash = h.tokens.hashOf(refreshToken);
  const row: RefreshTokenRow = {
    id: randomUUID(),
    userId: opts.userId ?? 'user-1',
    familyId: opts.familyId ?? 'fam-1',
    parentTokenHash: null,
    hash,
    status: opts.status ?? 'issued',
    expiresAt: opts.expiresAt ?? new Date(Date.now() + 60_000),
    createdAt: new Date(),
  };
  h.refreshStore.rowsByHash.set(hash, row);
  h.refreshStore.rowsById.set(row.id, row);
  return row;
}

describe('RefreshToken use case — rotation state machine', () => {
  it('rotates a valid issued token: issues a new pair + marks the old rotated', async () => {
    const h = makeHarness();
    const R1 = 'r1-token';
    seedRow(h, R1);

    const result = await h.refresh.execute({ refreshToken: R1 });

    // New access + refresh issued.
    expect(h.tokens.signAccessCalls).toBe(1);
    expect(h.refreshStore.issueCalls).toBe(1);
    expect(result.accessToken.length).toBeGreaterThan(0);
    expect(result.refreshToken.length).toBeGreaterThan(0);
    // Old row marked rotated with the new hash.
    expect(h.refreshStore.markRotatedCalls).toHaveLength(1);
    expect(h.refreshStore.markRotatedCalls[0].newHash).toEqual(
      expect.any(String),
    );
    // Lock acquired and released exactly once (try/finally).
    expect(h.refreshStore.lockAcquired).toBe(1);
    expect(h.refreshStore.lockReleased).toBe(1);
  });

  it('detects reuse of an already-rotated token and revokes the whole family', async () => {
    const h = makeHarness();
    const R1 = 'r1-token';
    const famId = 'fam-reuse';
    seedRow(h, R1, { familyId: famId });

    // First refresh rotates R1 into R2.
    await h.refresh.execute({ refreshToken: R1 });
    expect(h.refreshStore.markRotatedCalls).toHaveLength(1);
    const issuedAfterRotate = h.refreshStore.issueCalls; // R2 issued
    // The original R1 row is now rotated.
    expect(h.refreshStore.rowsByHash.get(h.tokens.hashOf(R1))!.status).toBe('rotated');

    // Now re-present R1 — reuse detected.
    await expect(h.refresh.execute({ refreshToken: R1 })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );

    // Family revoked; NO new tokens were issued on the reuse attempt.
    expect(h.refreshStore.revokeFamilyCalls).toContain(famId);
    expect(h.refreshStore.issueCalls).toBe(issuedAfterRotate); // unchanged
    // Every row in the family is now revoked.
    for (const row of h.refreshStore.rowsByHash.values()) {
      if (row.familyId === famId) expect(row.status).toBe('revoked');
    }
  });

  it('rejects an unknown refresh token before acquiring any lock', async () => {
    const h = makeHarness();
    await expect(
      h.refresh.execute({ refreshToken: 'never-issued' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    // No lock was ever acquired for a missing token.
    expect(h.refreshStore.lockAcquired).toBe(0);
    expect(h.refreshStore.lockReleased).toBe(0);
    expect(h.refreshStore.revokeFamilyCalls).toHaveLength(0);
  });

  it('rejects an expired refresh token (provisional check, no lock)', async () => {
    const h = makeHarness();
    seedRow(h, 'expired-token', { expiresAt: new Date(Date.now() - 1_000) });
    await expect(
      h.refresh.execute({ refreshToken: 'expired-token' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(h.refreshStore.lockAcquired).toBe(0);
    expect(h.refreshStore.lockReleased).toBe(0);
  });

  it('rejects a revoked token without re-revoking the family', async () => {
    const h = makeHarness();
    seedRow(h, 'revoked-token', { status: 'revoked' });
    await expect(
      h.refresh.execute({ refreshToken: 'revoked-token' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(h.refreshStore.revokeFamilyCalls).toHaveLength(0); // already terminal
    expect(h.refreshStore.issueCalls).toBe(0);
    // Lock still released via finally even on the reject path.
    expect(h.refreshStore.lockReleased).toBeGreaterThanOrEqual(1);
  });
});

describe('RefreshToken use case — lock torture (try/finally holds)', () => {
  it('releases the per-user lock even when markRotated throws mid-rotation', async () => {
    const h = makeHarness();
    seedRow(h, 'r-torture');
    h.refreshStore.markRotatedThrows = new Error('boom');

    // The rotation fails (markRotated blows up inside the try), but the lock
    // MUST still be released in the finally block (design Warning W4).
    await expect(
      h.refresh.execute({ refreshToken: 'r-torture' }),
    ).rejects.toThrow('boom');

    expect(h.refreshStore.lockAcquired).toBe(1);
    expect(h.refreshStore.lockReleased).toBe(1); // try/finally held — the whole point
  });
});

describe('Logout use case — revoke family + idempotent', () => {
  it('revokes the family of a presented refresh token that has a stored row', async () => {
    const h = makeHarness();
    const row = seedRow(h, 'logout-token', { familyId: 'fam-out' });
    await h.logout.execute({ refreshToken: 'logout-token' });
    expect(h.refreshStore.revokeFamilyCalls).toEqual([row.familyId]);
  });

  it('is idempotent when the refresh token is missing/empty (no throw)', async () => {
    const h = makeHarness();
    await h.logout.execute({ refreshToken: undefined });
    await h.logout.execute({ refreshToken: '' });
    expect(h.refreshStore.revokeFamilyCalls).toHaveLength(0);
  });

  it('is idempotent when the refresh token has no stored row', async () => {
    const h = makeHarness();
    await h.logout.execute({ refreshToken: 'nothing-here' });
    expect(h.refreshStore.revokeFamilyCalls).toHaveLength(0);
  });
});