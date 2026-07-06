/**
 * AuthController.logout — HTTP cookie contract unit test (task 4.2; spec:
 * "Logout / Revocation" — "the refresh cookie is cleared").
 *
 * Infrastructure-level spec: the controller is a NestJS adapter living in the
 * infrastructure layer (layer-guard allows @nestjs + Application imports here).
 * We instantiate it with a stubbed logout use case + a fake Express Response
 * to assert the cookie-clearing contract without booting Nest.
 */
import { ACCESS_TOKEN_COOKIE } from '@shared/AuthGuard';
import { AuthController, REFRESH_TOKEN_COOKIE } from '../AuthController';

function fakeResponse() {
  const cleared: string[] = [];
  const res = {
    cleared,
    clearCookie(name: string) {
      cleared.push(name);
      return res;
    },
    cookie() {
      return res;
    },
  };
  return res as unknown as import('express').Response & { cleared: string[] };
}

function stubUseCase() {
  // Use-case stubs satisfy the AuthController constructor's use-case-typed
  // params structurally (execute()). `any` keeps the stubs agnostic to the
  // concrete use-case class types the controller declares.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { execute: jest.fn().mockResolvedValue(undefined) } as any;
}

describe('AuthController.logout', () => {
  it('clears BOTH the refresh and access cookies after calling the logout use case', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logoutUseCase: any = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = new AuthController(
      stubUseCase(),
      stubUseCase(),
      stubUseCase(),
      logoutUseCase,
    );
    const req = {
      cookies: { [REFRESH_TOKEN_COOKIE]: 'some-refresh-token' },
    } as unknown as import('express').Request;
    const res = fakeResponse();

    const out = await controller.logout(req, res);

    expect(out).toEqual({ ok: true });
    expect(logoutUseCase.execute).toHaveBeenCalledWith({ refreshToken: 'some-refresh-token' });
    expect(res.cleared).toEqual(
      expect.arrayContaining([REFRESH_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE]),
    );
    expect(res.cleared).toHaveLength(2);
  });
});