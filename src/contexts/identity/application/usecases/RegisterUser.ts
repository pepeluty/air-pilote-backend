/**
 * RegisterUser — register a new player (spec: Registration).
 *
 * Flow:
 *   1. Validate email + password at the domain edge (Credentials VO →
 *      PasswordPolicy → PasswordStrengthError on weak passwords).
 *   2. Reject duplicate emails via UserRepository (DuplicateEmailError, 409).
 *   3. Hash the password via the PasswordHasher port (Argon2id — plaintext is
 *      never persisted, spec "Plaintext never persisted").
 *   4. Persist the User aggregate.
 *   5. Issue an access token (TokenSigner.signAccess) and a refresh token
 *      (RefreshTokenStore.issue, new family root: parentHash=null).
 *   6. Return an {@link AuthToken} pair.
 *
 * Application layer: framework-agnostic — depends only on ports + domain.
 */
import { randomUUID } from 'node:crypto';
import { UseCase } from '@shared/application/UseCase';
import { DuplicateEmailError } from '@shared/errors';
import { User } from '../../domain/User';
import { AuthToken } from '../../domain/vo/AuthToken';
import { Credentials } from '../../domain/vo/Credentials';
import { PasswordHasher } from '../ports/PasswordHasher.port';
import { RefreshTokenStore } from '../ports/RefreshTokenStore.port';
import { TokenSigner } from '../ports/TokenSigner.port';
import { UserRepository } from '../ports/UserRepository.port';

export interface RegisterCommand {
  readonly email: string;
  readonly password: string;
}

export class RegisterUser extends UseCase<RegisterCommand, AuthToken> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenSigner,
    private readonly refreshStore: RefreshTokenStore,
  ) {
    super();
  }

  async execute(command: RegisterCommand): Promise<AuthToken> {
    // (1) Validate at the domain edge — throws ValidationError /
    // PasswordStrengthError before any I/O.
    const credentials = Credentials.create(command.email, command.password);

    // (2) Reject duplicate emails.
    const existing = await this.users.findByEmail(credentials.email.value);
    if (existing !== null) {
      throw new DuplicateEmailError('email_already_registered');
    }

    // (3) Hash the password — plaintext never persists beyond this line.
    const passwordHash = await this.hasher.hash(credentials.password);

    // (4) Persist the User aggregate.
    const user = User.create(
      randomUUID(),
      credentials.email,
      passwordHash,
    );
    await this.users.save(user);

    // (5) Issue tokens — new family root (parentHash=null).
    return this.issueTokens(user.id);
  }

  /** Issue an access + refresh pair for `userId` (shared with LoginUser). */
  private async issueTokens(userId: string): Promise<AuthToken> {
    const accessToken = this.tokens.signAccess({ userId });
    const familyId = randomUUID();
    const { token: refreshToken } = await this.refreshStore.issue(
      userId,
      familyId,
      null,
    );
    return AuthToken.create(accessToken, refreshToken);
  }
}
