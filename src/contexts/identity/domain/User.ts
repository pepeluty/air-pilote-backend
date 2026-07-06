/**
 * User — identity aggregate root.
 *
 * Owns the player's identity: a unique email and a hashed password (never
 * plaintext — spec "Plaintext never persisted"). Constructed via the
 * {@link User.create} factory so invariants (non-empty id, valid email VO) are
 * enforced at the edge. No ORM/Nest decorators — the persistence model is
 * {@link UserEntity} in the infrastructure layer, mapped to/from this domain
 * entity (design Decision #2 Data Mapper + UoW). Domain layer:
 * framework-agnostic.
 */
import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { Email } from './vo/Email';

export interface UserProps {
  readonly id: string;
  readonly email: Email;
  readonly passwordHash: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class User extends AggregateRoot<string> {
  public readonly email: Email;
  public readonly passwordHash: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: UserProps) {
    super(props.id);
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Factory for a freshly registered user. `createdAt`/`updatedAt` default to
   * now when omitted so the registration use case does not have to supply them.
   * The password MUST already be hashed by the {@link PasswordHasher} port
   * before reaching this factory — plaintext is never stored on the aggregate.
   */
  static create(
    id: string,
    email: Email,
    passwordHash: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ): User {
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('user_id_required');
    }
    if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
      throw new Error('user_password_hash_required');
    }
    return new User({ id, email, passwordHash, createdAt, updatedAt });
  }

  /** Rehydrate an aggregate from persistence (no invariant re-validation). */
  static rehydrate(props: UserProps): User {
    return new User(props);
  }
}
