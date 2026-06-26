/**
 * AuthGuard — global NestJS guard (design Decision #5, CRITICAL).
 *
 * Chokepoint for EVERY protected endpoint. Flow:
 *   1. Extract access token from Authorization Bearer header AND/OR httpOnly
 *      cookie (Decision #6 — support both).
 *   2. No token at all -> UnauthenticatedError (401).
 *   3. Verify the token via the injected {@link TokenVerifier} port; invalid
 *      or expired -> UnauthenticatedError (401).
 *   4. Resolve userId from the verified token, then call {@link UserExists}.
 *      `false` -> NonExistentUserError (401) — THE CRITICAL FIX: no FK 500.
 *   5. All checks pass -> allow the request through.
 *
 * Lives in shared/ for cross-context reuse; it is a NestJS infrastructure-tier
 * adapter and is exempted from the framework-agnostic layer guard in
 * .eslintrc.cjs. Dependencies are injected via the {@link TOKEN_VERIFIER} and
 * {@link USER_EXISTS} symbol tokens.
 */
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TOKEN_VERIFIER, TokenVerifier } from './TokenVerifier.port';
import { USER_EXISTS, UserExists } from './UserExists.port';
import {
  DomainError,
  NonExistentUserError,
  UnauthenticatedError,
} from './errors';

/** Cookie name carrying the access token (Decision #6 — cookie delivery). */
export const ACCESS_TOKEN_COOKIE = 'access_token';

/** NestJS injection token for the optional public-routes metadata. */
export const IS_PUBLIC_KEY = Symbol('IS_PUBLIC');

/**
 * Set a route handler as public (skips AuthGuard). Imported and applied by
 * controllers via `SetMetadata(IS_PUBLIC_KEY, true)`.
 */
export const Public = () => (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
  Reflect.defineMetadata(IS_PUBLIC_KEY, true, descriptor?.value ?? target);
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
    @Inject(USER_EXISTS) private readonly userExists: UserExists,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.getIsPublic(context);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthenticatedError('no_access_token');
    }

    let userId: string;
    try {
      userId = this.tokenVerifier.verifyAccess(token).userId;
    } catch {
      throw new UnauthenticatedError('invalid_or_expired_access_token');
    }

    const exists = await this.userExists.exists(userId);
    if (!exists) {
      throw new NonExistentUserError('user_no_longer_exists');
    }
    return true;
  }

  /** Read the IS_PUBLIC_KEY metadata from the handler then its class. */
  private getIsPublic(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const classRef = context.getClass();
    return (
      Boolean(Reflect.getMetadata(IS_PUBLIC_KEY, handler)) ||
      Boolean(Reflect.getMetadata(IS_PUBLIC_KEY, classRef))
    );
  }

  /** Authorization Bearer header first, then httpOnly cookie (Decision #6). */
  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (header && /^Bearer\s+\S+/i.test(header)) {
      return header.slice(7).trim();
    }
    const cookieToken = (request as Request & { cookies?: Record<string, string> }).cookies?.[
      ACCESS_TOKEN_COOKIE
    ];
    return cookieToken || undefined;
  }
}

/**
 * Re-export the DomainError types so the exception filter can import a single
 * barrel from this module if desired. Kept narrow to avoid a wide surface.
 */
export type { DomainError };
export { UnauthorizedException };
