/**
 * AuthToken — value object representing the token pair returned by the
 * RegisterUser, LoginUser, and RefreshToken use cases.
 *
 * Carries the short-lived access token (Authorization header + httpOnly cookie,
 * design Decision #6) and the rotating refresh token (httpOnly Secure
 * SameSite=Strict cookie). The pair is the single success shape of every auth
 * issuance flow. Domain layer: framework-agnostic — no @nestjs/@mikro-orm.
 */
import { ValueObject } from '@shared/domain/ValueObject';

export class AuthToken extends ValueObject {
  private constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {
    super();
  }

  static create(accessToken: string, refreshToken: string): AuthToken {
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      throw new Error('accessToken_required');
    }
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      throw new Error('refreshToken_required');
    }
    return new AuthToken(accessToken, refreshToken);
  }

  equals(other: unknown): boolean {
    return (
      other instanceof AuthToken &&
      other.accessToken === this.accessToken &&
      other.refreshToken === this.refreshToken
    );
  }
}
