/**
 * Credentials — transient value object bundling an email and a plaintext
 * password for the RegisterUser / LoginUser use cases.
 *
 * The plaintext password is NEVER persisted: it lives only inside this VO for
 * the duration of a single use-case execution, after which it is hashed via
 * the {@link PasswordHasher} port and discarded (spec: "Plaintext never
 * persisted"). Construction validates the password through {@link PasswordPolicy}
 * so a weak password is rejected at the domain edge with
 * {@link PasswordStrengthError}. Domain layer: framework-agnostic.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { Email } from './Email';
import { PasswordPolicy } from '../PasswordPolicy';

export class Credentials extends ValueObject {
  private constructor(
    public readonly email: Email,
    public readonly password: string,
  ) {
    super();
  }

  /**
   * Build {@link Credentials} from raw inputs. Validates the email shape and
   * the password strength, throwing {@link ValidationError} /
   * {@link PasswordStrengthError} on the first failure.
   */
  static create(rawEmail: string, rawPassword: string): Credentials {
    const email = Email.create(rawEmail);
    PasswordPolicy.validate(rawPassword);
    return new Credentials(email, rawPassword);
  }

  equals(other: unknown): boolean {
    return (
      other instanceof Credentials &&
      other.email.equals(this.email) &&
      other.password === this.password
    );
  }
}
