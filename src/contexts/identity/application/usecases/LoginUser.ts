/**
 * LoginUser — verify credentials and issue a token pair (spec: Login).
 *
 * Flow:
 *   1. Look up the user by email. A missing user is indistinguishable from a
 *      wrong password to the caller — both surface as InvalidCredentialsError
 *      (401) so the endpoint cannot be used for user enumeration.
 *   2. Verify the password via PasswordHasher.verify; a failed verify also
 *      surfaces as InvalidCredentialsError.
 *   3. Issue an access token + a fresh refresh family (new familyId,
 *      parentHash=null) and return an {@link AuthToken}.
 *
 * NOTE: the password is NOT re-validated against PasswordPolicy here. Login
 * must accept any password that was acceptable at registration time, even if
 * the policy is later tightened. Policy is a registration-edge concern.
 *
 * Application layer: framework-agnostic — depends only on ports + domain.
 */
import { randomUUID } from 'node:crypto';
import { UseCase } from '@shared/application/UseCase';
import { InvalidCredentialsError } from '@shared/errors';
import { AuthToken } from '../../domain/vo/AuthToken';
import { Email } from '../../domain/vo/Email';
import { PasswordHasher } from '../ports/PasswordHasher.port';
import { RefreshTokenStore } from '../ports/RefreshTokenStore.port';
import { TokenSigner } from '../ports/TokenSigner.port';
import { UserRepository } from '../ports/UserRepository.port';

export interface LoginCommand {
  readonly email: string;
  readonly password: string;
}

export class LoginUser extends UseCase<LoginCommand, AuthToken> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenSigner,
    private readonly refreshStore: RefreshTokenStore,
  ) {
    super();
  }

  async execute(command: LoginCommand): Promise<AuthToken> {
    // (1) Parse the email shape; an invalid email is treated as a miss so the
    // endpoint does not leak which emails are registered.
    let email: Email;
    try {
      email = Email.create(command.email);
    } catch {
      throw new InvalidCredentialsError('invalid_credentials');
    }

    const user = await this.users.findByEmail(email.value);
    if (user === null) {
      throw new InvalidCredentialsError('invalid_credentials');
    }

    // (2) Verify the password; combine the miss with the no-user miss above.
    const ok = await this.hasher.verify(command.password, user.passwordHash);
    if (!ok) {
      throw new InvalidCredentialsError('invalid_credentials');
    }

    // (3) Issue a fresh family (a new login starts a new chain).
    const accessToken = this.tokens.signAccess({ userId: user.id });
    const familyId = randomUUID();
    const { token: refreshToken } = await this.refreshStore.issue(
      user.id,
      familyId,
      null,
    );
    return AuthToken.create(accessToken, refreshToken);
  }
}
