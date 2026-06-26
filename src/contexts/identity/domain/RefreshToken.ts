/**
 * RefreshToken — domain entity tracking a refresh-token family chain.
 *
 * Canonical state machine (design Decision #4, Warning W1):
 *
 *   issued --rotate--> rotated --(reuse of any descendant)--> revoked
 *   issued --(reuse)--> revoked
 *
 * The status set is EXACTLY `'issued' | 'rotated' | 'revoked'`. `revoked` is
 * terminal. REUSE IS A TRIGGER, NOT A STATUS — there is no `reused` status; a
 * presented token whose row is already `rotated` triggers a family-wide
 * `revoked` transition (detected by the RefreshToken use case, W3). This entity
 * only enforces that transitions are valid; the *decision* of which transition
 * to apply based on the presented row lives in the use case.
 *
 * Domain layer: framework-agnostic — no @nestjs/@mikro-orm. The persistence
 * projection is {@link RefreshTokenRow} (application port type) and the ORM
 * entity is `RefreshTokenEntity` (infrastructure).
 */
import { Entity } from '@shared/domain/Entity';

export type RefreshTokenStatus = 'issued' | 'rotated' | 'revoked';

export interface RefreshTokenProps {
  readonly id: string;
  readonly userId: string;
  readonly familyId: string;
  readonly parentTokenHash: string | null;
  readonly hash: string;
  readonly status: RefreshTokenStatus;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

export class RefreshToken extends Entity<string> {
  public readonly userId: string;
  public readonly familyId: string;
  public readonly parentTokenHash: string | null;
  public readonly hash: string;
  public readonly status: RefreshTokenStatus;
  public readonly expiresAt: Date;
  public readonly createdAt: Date;

  private constructor(props: RefreshTokenProps) {
    super(props.id);
    this.userId = props.userId;
    this.familyId = props.familyId;
    this.parentTokenHash = props.parentTokenHash;
    this.hash = props.hash;
    this.status = props.status;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
  }

  /** Rehydrate from persistence. */
  static rehydrate(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  /** True when the token is past its expiry (independent of status). */
  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  /**
   * Transition `issued -> rotated`, recording the new hash that supersedes
   * this token. Throws on any other source status — only an `issued` token may
   * be rotated. Returns a NEW {@link RefreshToken} (immutable transition).
   */
  markRotated(newHash: string): RefreshToken {
    if (this.status !== 'issued') {
      throw new Error(
        `illegal_rotate: status=${this.status} (only 'issued' can rotate)`,
      );
    }
    if (typeof newHash !== 'string' || newHash.length === 0) {
      throw new Error('rotate_new_hash_required');
    }
    return new RefreshToken({
      ...this.toProps(),
      status: 'rotated',
      hash: newHash,
    });
  }

  /**
   * Transition `issued | rotated -> revoked` (terminal). Throws if already
   * revoked (no-op-on-revoked would hide bugs; callers revoking a family should
   * skip already-revoked rows). Returns a NEW {@link RefreshToken}.
   */
  revoke(): RefreshToken {
    if (this.status === 'revoked') {
      throw new Error(`illegal_revoke: status=revoked (already terminal)`);
    }
    return new RefreshToken({
      ...this.toProps(),
      status: 'revoked',
    });
  }

  /** Predicate for the use case's reuse-detection branch. */
  isRotated(): boolean {
    return this.status === 'rotated';
  }

  /** Predicate for the use case's happy-path rotation branch. */
  isIssued(): boolean {
    return this.status === 'issued';
  }

  private toProps(): RefreshTokenProps {
    return {
      id: this.id,
      userId: this.userId,
      familyId: this.familyId,
      parentTokenHash: this.parentTokenHash,
      hash: this.hash,
      status: this.status,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
    };
  }
}
