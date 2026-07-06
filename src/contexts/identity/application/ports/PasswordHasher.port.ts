/**
 * PasswordHasher — outbound port for password hashing/verification
 * (design Decision #3: Argon2id behind a swappable port).
 *
 * Implementations MUST discard plaintext after hashing and MUST NOT log it
 * (spec: "Plaintext never persisted"). Application layer: framework-agnostic.
 */
import type { Port } from '@shared/application/Port';

export interface PasswordHasher extends Port {
  /** @returns the Argon2id hash of `plaintext` (never the plaintext). */
  hash(plaintext: string): Promise<string>;
  /** @returns true iff `plaintext` matches `hash`. Constant-time compare. */
  verify(plaintext: string, hash: string): Promise<boolean>;
}
