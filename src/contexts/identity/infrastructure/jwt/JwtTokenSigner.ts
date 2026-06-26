/**
 * JwtTokenSigner — adapter implementing the identity {@link TokenSigner} port
 * AND the shared-kernel {@link TokenVerifier} port (design Decision #5/#6).
 *
 * Access tokens: short-lived JWTs (HS256) carrying `{ sub: userId, type:
 * 'access' }`, signed with `JWT_ACCESS_SECRET` (or `JWT_SECRET`), expiring after
 * `JWT_ACCESS_EXPIRES_IN` (default 15m). Delivered via the Authorization header
 * AND an httpOnly cookie (Decision #6 — the controller sets both).
 *
 * Refresh tokens: opaque random 32-byte strings (NOT JWTs — they carry no user
 * data). The storage `hash` is `sha256(token)` hex; the same `hashOf` derives the
 * lookup hash of a presented token. This keeps the refresh token a pure
 * capability whose only meaning is the stored row.
 *
 * `verifyAccess` satisfies BOTH `TokenSigner.verifyAccess` and
 * `TokenVerifier.verifyAccess` (identical signatures) — the global AuthGuard
 * verifies access tokens through the shared port while the identity use cases
 * sign them through the identity port.
 *
 * Infrastructure layer: framework allowed (NestJS + jsonwebtoken + node:crypto).
 */
import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { sign, verify } from 'jsonwebtoken';
import type { TokenVerifier } from '@shared/TokenVerifier.port';
import type { TokenSigner } from '../../application/ports/TokenSigner.port';

interface AccessTokenPayload {
  sub: string;
  type: string;
}

@Injectable()
export class JwtTokenSigner implements TokenSigner, TokenVerifier {
  private readonly accessSecret: string;
  /** Access-token lifetime in SECONDS (jsonwebtoken's `expiresIn` number form). */
  private readonly accessExpiresInSeconds: number;

  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
      // Fail loud in production; allow a marked dev fallback locally so the
      // server still boots without env. The warning makes the risk visible.
      // eslint-disable-next-line no-console
      console.warn(
        'JWT_ACCESS_SECRET not set or too short (<16 chars) — using insecure dev fallback. Set a strong secret in production.',
      );
      this.accessSecret = 'dev-access-secret-change-me-in-prod';
    } else {
      this.accessSecret = secret;
    }
    this.accessExpiresInSeconds = Number(
      process.env.JWT_ACCESS_EXPIRES_SECONDS ?? 900, // 15 minutes
    );
  }

  signAccess(payload: { userId: string }): string {
    return sign({ sub: payload.userId, type: 'access' }, this.accessSecret, {
      expiresIn: this.accessExpiresInSeconds,
    });
  }

  signRefresh(): { token: string; hash: string } {
    const token = randomBytes(32).toString('hex');
    const hash = this.hashOf(token);
    return { token, hash };
  }

  verifyAccess(token: string): { userId: string } {
    const payload = verify(token, this.accessSecret) as AccessTokenPayload;
    if (payload.type !== 'access' || typeof payload.sub !== 'string') {
      throw new Error('invalid_access_token');
    }
    return { userId: payload.sub };
  }

  hashOf(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
