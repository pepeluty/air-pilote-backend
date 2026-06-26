import { DomainError } from './DomainError';

export { DomainError };

/**
 * 409 Conflict — a registration attempted to reuse an email already in use.
 */
export class DuplicateEmailError extends DomainError {}

/**
 * 422 Unprocessable Entity — a password failed the PasswordPolicy
 * (min 8, max 72, >=1 letter AND >=1 number; design R3).
 */
export class PasswordStrengthError extends DomainError {}

/**
 * 422 Unprocessable Entity — generic validation failure
 * (e.g. negative Score VO, malformed request body).
 */
export class ValidationError extends DomainError {}

/**
 * 401 Unauthorized — login failed (wrong email/password) or an expired
 * refresh token was presented.
 */
export class InvalidCredentialsError extends DomainError {}

/**
 * 401 Unauthorized — no access token was provided, or the token could not
 * be verified (foreign/expired/unsigned).
 */
export class UnauthenticatedError extends DomainError {}

/**
 * 401 Unauthorized — the access token decoded successfully but the subject
 * user no longer exists (e.g. deleted account).
 *
 * CRITICAL (design Decision #5): this is the clean 401 surfaced by the global
 * AuthGuard's UserExists check, replacing a raw FK 500 from game-records.
 */
export class NonExistentUserError extends DomainError {}
