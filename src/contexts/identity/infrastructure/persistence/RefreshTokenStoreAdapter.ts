/**
 * RefreshTokenStoreAdapter — PostgreSQL-backed {@link RefreshTokenStore} with an
 * in-memory per-user rotation lock (design Decision #4 + Warning W4, OQ MVP).
 *
 * Responsibilities:
 *   - issue: generate a refresh token via {@link TokenSigner.signRefresh},
 *     persist an `issued` row, return { token, hash, row }.
 *   - findByHash: load a row by storage hash (or null).
 *   - markRotated: transition a row `issued -> rotated` via the domain
 *     {@link RefreshToken.markRotated} (enforces valid source status).
 *   - revokeFamily: transition every row in a family to `revoked` via the
 *     domain {@link RefreshToken.revoke} (skips already-revoked rows).
 *   - acquireLock/releaseLock: in-memory per-user mutex serializing rotations.
 *
 * The state-machine DECISION lives in the use case (W3); this adapter only
 * enforces valid transitions and persists. The lock is in-memory (single
 * instance) for MVP — Postgres advisory lock is the documented scale path
 * (design Open Question).
 *
 * Infrastructure layer: framework allowed (NestJS + MikroORM).
 */
import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';
import type { LockHandle, RefreshTokenRow } from '../../application/ports/types';
import { RefreshTokenStore } from '../../application/ports/RefreshTokenStore.port';
import { RefreshTokenEntity } from './RefreshTokenEntity';
import { RefreshTokenMapper } from './mappers';
import { JwtTokenSigner } from '../jwt/JwtTokenSigner';

/** DI token for the refresh-token row TTL in milliseconds. */
export const REFRESH_TOKEN_TTL_MS = Symbol('REFRESH_TOKEN_TTL_MS');

/** Default refresh row lifetime: 7 days. */
const DEFAULT_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshTokenStoreAdapter implements RefreshTokenStore {
  /**
   * Per-user mutex state. `holders` maps a userId to the current holder's
   * "done" promise; the next acquireLock awaits it. `releasers` maps each
   * returned LockHandle to its own release function (WeakMap so handles are
   * GC'd once the caller drops them after releaseLock).
   */
  private readonly holders = new Map<string, Promise<void>>();
  private readonly releasers = new WeakMap<LockHandle, () => void>();

  constructor(
    private readonly em: EntityManager,
    private readonly tokens: JwtTokenSigner,
    @Inject(REFRESH_TOKEN_TTL_MS) private readonly refreshTtlMs: number,
  ) {}

  async issue(
    userId: string,
    familyId: string,
    parentHash: string | null,
  ): Promise<{ token: string; hash: string; row: RefreshTokenRow }> {
    const { token, hash } = this.tokens.signRefresh();
    const now = new Date();
    const entity = new RefreshTokenEntity();
    entity.id = randomUUID();
    entity.userId = userId;
    entity.familyId = familyId;
    entity.parentTokenHash = parentHash;
    entity.hash = hash;
    entity.status = 'issued';
    entity.expiresAt = new Date(now.getTime() + this.refreshTtlMs);
    entity.createdAt = now;
    this.em.persist(entity);
    await this.em.flush();
    return { token, hash, row: RefreshTokenMapper.toRow(entity) };
  }

  async findByHash(hash: string): Promise<RefreshTokenRow | null> {
    const entity = await this.em.findOne(RefreshTokenEntity, { hash });
    return entity ? RefreshTokenMapper.toRow(entity) : null;
  }

  async markRotated(id: string, newHash: string): Promise<void> {
    const entity = await this.em.findOne(RefreshTokenEntity, { id });
    if (entity === null) {
      throw new Error(`refresh_token_not_found: ${id}`);
    }
    // Enforce issued -> rotated via the domain entity (throws on other statuses).
    const rotated = RefreshTokenMapper.toDomain(entity).markRotated(newHash);
    entity.status = rotated.status; // 'rotated' — hash is preserved for reuse detection
    await this.em.flush();
  }

  async revokeFamily(familyId: string): Promise<void> {
    const entities = await this.em.find(RefreshTokenEntity, { familyId });
    for (const entity of entities) {
      if (entity.status === 'revoked') continue; // already terminal — skip
      const revoked = RefreshTokenMapper.toDomain(entity).revoke();
      entity.status = revoked.status; // 'revoked'
    }
    await this.em.flush();
  }

  async acquireLock(userId: string): Promise<LockHandle> {
    // Chain on the previous holder's "done" promise; install our own done
    // promise as the new holder so the next acquirer waits on us.
    const prev = this.holders.get(userId) ?? Promise.resolve();
    let release!: () => void;
    const done = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.holders.set(userId, done);
    const handle: LockHandle = { userId, acquiredAt: Date.now() };
    this.releasers.set(handle, release);
    await prev;
    return handle;
  }

  async releaseLock(handle: LockHandle): Promise<void> {
    const release = this.releasers.get(handle);
    if (release) {
      release();
      this.releasers.delete(handle);
    }
  }
}

export { DEFAULT_REFRESH_TTL_MS };
