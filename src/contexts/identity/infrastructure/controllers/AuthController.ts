/**
 * AuthController — HTTP adapter for the identity use cases
 * (spec: Registration, Login, Refresh Token Rotation, Logout / Revocation).
 *
 * Routes:
 *   POST /auth/register  @Public  -> RegisterUser -> access+refresh cookies, { accessToken }
 *   POST /auth/login     @Public  -> LoginUser    -> access+refresh cookies, { accessToken }
 *   POST /auth/refresh   @Public  -> RefreshToken -> rotated refresh cookie, new access cookie
 *   POST /auth/logout    (auth)   -> Logout       -> clears refresh + access cookies
 *
 * Token delivery (design Decision #6): the ACCESS token is returned in the
 * response body (so API clients can use it as a Bearer header) AND set as an
 * httpOnly cookie (so browser fetch with credentials works). The REFRESH token
 * is httpOnly + Secure + SameSite=Strict cookie only — never in the body.
 *
 * The global AuthGuard (PR 2) protects every non-@Public route; logout is
 * protected (the caller must present a valid access token), while
 * register/login/refresh are @Public because the caller does not yet have (or
 * is rotating) an access token.
 *
 * Infrastructure layer: framework allowed (NestJS).
 */
import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ACCESS_TOKEN_COOKIE, Public } from '@shared/AuthGuard';
import { InvalidCredentialsError } from '@shared/errors';
import { LoginUser } from '../../application/usecases/LoginUser';
import { Logout } from '../../application/usecases/Logout';
import { RefreshToken } from '../../application/usecases/RefreshToken';
import { RegisterUser } from '../../application/usecases/RegisterUser';

/** Refresh-token cookie name (httpOnly + Secure + SameSite=Strict). */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

interface RegisterDto {
  email?: string;
  password?: string;
}

interface LoginDto {
  email?: string;
  password?: string;
}

@Controller('auth')
export class AuthController {
  /** Cookies are Secure in production; dev over HTTP needs Secure=false. */
  private readonly secure = process.env.NODE_ENV === 'production';

  private get refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'strict' as const,
      path: '/auth',
    };
  }

  private get accessCookieOptions() {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'strict' as const,
      path: '/',
    };
  }

  @Post('register')
  @Public()
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const tokens = await this.registerUser.execute({
      email: body.email ?? '',
      password: body.password ?? '',
    });
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('login')
  @Public()
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const tokens = await this.loginUser.execute({
      email: body.email ?? '',
      password: body.password ?? '',
    });
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @Public()
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const presented = this.readRefreshCookie(req);
    const tokens = await this.refreshTokenUseCase.execute({
      refreshToken: presented,
    });
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const presented = this.readRefreshCookie(req);
    await this.logoutUseCase.execute({ refreshToken: presented });
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.refreshCookieOptions);
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.accessCookieOptions);
    return { ok: true };
  }

  // --- wiring (injected by the identity module via class tokens) ---
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly loginUser: LoginUser,
    private readonly refreshTokenUseCase: RefreshToken,
    private readonly logoutUseCase: Logout,
  ) {}

  // --- helpers ---

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, this.accessCookieOptions);
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, this.refreshCookieOptions);
  }

  private readRefreshCookie(req: Request): string {
    const value = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_TOKEN_COOKIE
    ];
    if (typeof value !== 'string' || value.length === 0) {
      throw new InvalidCredentialsError('refresh_token_not_provided');
    }
    return value;
  }
}
