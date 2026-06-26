/**
 * Argon2PasswordHasher — adapter implementing {@link PasswordHasher} with
 * Argon2id (design Decision #3: OWASP-recommended, memory-hard, behind a
 * swappable port). Plaintext is accepted, hashed, and immediately discarded —
 * it is never persisted or logged (spec: "Plaintext never persisted").
 *
 * Infrastructure layer: framework allowed (NestJS + argon2).
 */
import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';
import type { PasswordHasher } from '../../application/ports/PasswordHasher.port';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plaintext: string): Promise<string> {
    return hash(plaintext, { type: argon2id });
  }

  async verify(plaintext: string, digest: string): Promise<boolean> {
    try {
      return await verify(digest, plaintext);
    } catch {
      // Malformed hash / unsupported variant — treat as a failed verify rather
      // than surfacing a raw error (callers combine this with user-not-found).
      return false;
    }
  }
}
