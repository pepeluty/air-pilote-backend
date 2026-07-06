/**
 * Cross-cutting types shared by the identity application ports (design W2 —
 * RefreshTokenRow and LockHandle explicitly defined).
 *
 * Application layer: framework-agnostic — no @nestjs/@mikro-orm.
 */
import type { RefreshTokenStatus } from '../../domain/RefreshToken';

/**
 * Persistence projection of a refresh-token row. The status set is EXACTLY
 * `'issued' | 'rotated' | 'revoked'` (design Decision #4, W1): `revoked` is
 * terminal and reuse is a TRIGGER (transition into `revoked`), not a status of
 * its own. The use case reads `status` to decide the branch and calls store
 * methods to transition rows — the state-machine DECISION lives in the use case
 * (W3), while valid-transition enforcement lives on the domain
 * {@link RefreshToken} entity.
 */
export interface RefreshTokenRow {
  id: string;
  userId: string;
  familyId: string;
  parentTokenHash: string | null;
  hash: string;
  status: RefreshTokenStatus;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Handle returned by {@link RefreshTokenStore.acquireLock}. Opaque to callers —
 * they MUST release it via {@link RefreshTokenStore.releaseLock} in a `finally`
 * block (design Warning W4). The shape is part of the contract so adapters can
 * carry whatever metadata they need (acquire timestamp, owner, etc.).
 */
export interface LockHandle {
  userId: string;
  acquiredAt: number;
}
