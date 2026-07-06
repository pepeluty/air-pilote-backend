/**
 * PasswordPolicy — strength policy for player passwords (design R3).
 *
 * Rules:
 *   - minimum length: 8 characters
 *   - maximum length: 72 characters (Argon2id input limit)
 *   - at least one letter AND at least one number
 *
 * Exposed as a pure domain policy: {@link PasswordPolicy.satisfies} returns a
 * boolean, {@link PasswordPolicy.validate} throws {@link PasswordStrengthError}
 * with a stable code describing the first violated rule. Domain layer:
 * framework-agnostic — no @nestjs/@mikro-orm.
 */
import { PasswordStrengthError } from '@shared/errors';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export class PasswordPolicy {
  /** True iff `password` satisfies every rule above. */
  static satisfies(password: string): boolean {
    return (
      typeof password === 'string' &&
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH &&
      /[a-zA-Z]/.test(password) &&
      /[0-9]/.test(password)
    );
  }

  /**
   * Throw {@link PasswordStrengthError} with a stable code for the first
   * violated rule, or return void when the password is compliant.
   */
  static validate(password: string): void {
    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
      throw new PasswordStrengthError('password_too_short');
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      throw new PasswordStrengthError('password_too_long');
    }
    if (!/[a-zA-Z]/.test(password)) {
      throw new PasswordStrengthError('password_missing_letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new PasswordStrengthError('password_missing_number');
    }
  }
}
