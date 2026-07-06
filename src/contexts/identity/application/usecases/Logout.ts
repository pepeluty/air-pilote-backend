/**
 * Logout — revoke the presented refresh token's family and signal the controller
 * to clear the refresh cookie (spec: Logout / Revocation).
 *
 * Flow:
 *   1. Derive the storage hash of the presented refresh token (via TokenSigner).
 *   2. Look up the row; if none is stored, logout is a no-op (idempotent — the
 *      cookie is still cleared by the controller).
 *   3. Revoke the entire family (`revokeFamily` -> every row `revoked`).
 *
 * Logout is intentionally tolerant: an invalid/expired/missing refresh token
 * does NOT raise — the desired end state (family revoked + cookie cleared) is
 * already reached when there is nothing to revoke. The controller always clears
 * the refresh cookie regardless of the outcome here.
 *
 * Application layer: framework-agnostic — depends only on ports.
 */
import { UseCase } from '@shared/application/UseCase';
import { RefreshTokenStore } from '../ports/RefreshTokenStore.port';
import { TokenSigner } from '../ports/TokenSigner.port';

export interface LogoutCommand {
  readonly refreshToken: string | undefined;
}

export class Logout extends UseCase<LogoutCommand, void> {
  constructor(
    private readonly tokens: TokenSigner,
    private readonly refreshStore: RefreshTokenStore,
  ) {
    super();
  }

  async execute(command: LogoutCommand): Promise<void> {
    if (typeof command.refreshToken !== 'string' || command.refreshToken.length === 0) {
      return; // nothing to revoke — controller still clears the cookie
    }
    const hash = this.tokens.hashOf(command.refreshToken);
    const row = await this.refreshStore.findByHash(hash);
    if (row === null) {
      return; // family already gone (expired cleanup, prior logout, etc.)
    }
    await this.refreshStore.revokeFamily(row.familyId);
  }
}
