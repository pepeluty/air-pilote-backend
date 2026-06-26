/**
 * Email — value object for a player's email address (identity context).
 *
 * Validates the canonical RFC-ish format on construction; throws
 * {@link ValidationError} on invalid input. Equality is value-based (same
 * normalized address). Domain layer: framework-agnostic — no @nestjs/@mikro-orm.
 *
 * Design R3 sibling: password strength is enforced by {@link PasswordPolicy};
 * email shape is enforced here.
 */
import { ValueObject } from '@shared/domain/ValueObject';
import { ValidationError } from '@shared/errors';

/** Practical email regex — local@domain with a single @ and a dotted domain. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  /**
   * Build an {@link Email} from a raw string. Trims + lowercases the input so
   * `A@B.CO ` and `a@b.co` compare equal. Throws {@link ValidationError} when
   * the shape is not a plausible email.
   */
  static create(raw: string): Email {
    if (typeof raw !== 'string') {
      throw new ValidationError('email_required');
    }
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('email_invalid_format');
    }
    return new Email(normalized);
  }

  equals(other: unknown): boolean {
    return other instanceof Email && other.value === this.value;
  }
}
