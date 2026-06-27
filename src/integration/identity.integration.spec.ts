/**
 * Identity infrastructure — Postgres integration tests (task 4.4; spec
 * backend-identity). Uses testcontainers to spin up PostgreSQL, init MikroORM,
 * and create the schema, then exercises the REAL adapters:
 *   - UserRepositoryAdapter save / findByEmail / findById / exists
 *   - RefreshTokenStoreAdapter issue / markRotated / revokeFamily persists all
 *     rows `revoked`
 *   - Argon2PasswordHasher hash + verify roundtrip
 *   - JwtTokenSigner signAccess + verifyAccess roundtrip + hashOf determinism
 *
 * Requires Docker. The whole suite is skipped when Docker is unavailable so
 * the unit-test gate stays green in environments without Docker.
 */
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Email } from '../contexts/identity/domain/vo/Email';
import { User } from '../contexts/identity/domain/User';
import { Argon2PasswordHasher } from '../contexts/identity/infrastructure/crypto/Argon2PasswordHasher';
import { JwtTokenSigner } from '../contexts/identity/infrastructure/jwt/JwtTokenSigner';
import { RefreshTokenStoreAdapter } from '../contexts/identity/infrastructure/persistence/RefreshTokenStoreAdapter';
import { UserRepositoryAdapter } from '../contexts/identity/infrastructure/persistence/UserRepositoryAdapter';
import { getEm, startDatabase, stopDatabase } from './db-harness';

// Docker availability gate (sync so the suite can be conditionally skipped).
function dockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const RUN = dockerAvailable();
const describeOrSkip = RUN ? describe : describe.skip;

jest.setTimeout(180_000);

describeOrSkip('Identity infrastructure (Postgres via testcontainers)', () => {
  beforeAll(async () => {
    await startDatabase();
  });
  afterAll(async () => {
    await stopDatabase();
  });

  describe('UserRepositoryAdapter (also UserExists read-model)', () => {
    it('saves, then finds by email and by id, and reports existence', async () => {
      const users = new UserRepositoryAdapter(getEm());
      const id = randomUUID();
      const email = `alice-${id}@test.io`;
      const user = User.create(id, Email.create(email), 'hashed$secret1');
      await users.save(user);

      expect((await users.findByEmail(email))?.id).toBe(id);
      expect((await users.findById(id))?.email.value).toBe(email);
      expect(await users.exists(id)).toBe(true);
      expect(await users.exists('00000000-0000-0000-0000-000000000000')).toBe(false);
    });

    it('returns null for an unknown email/id', async () => {
      const users = new UserRepositoryAdapter(getEm());
      expect(await users.findByEmail('no-such@user.io')).toBeNull();
      expect(await users.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });
  });

  describe('RefreshTokenStoreAdapter — family revoke persists all `revoked`', () => {
    it('issues, rotates, and revokes a family so every row is terminal', async () => {
      const jwt = new JwtTokenSigner();
      const store = new RefreshTokenStoreAdapter(getEm(), jwt, 60_000);
      const userId = randomUUID();
      const familyId = randomUUID();

      // R1: family root.
      const R1 = await store.issue(userId, familyId, null);
      expect(R1.row.status).toBe('issued');
      // R2: rotated successor in the same family (parent = R1's hash).
      const R2 = await store.issue(userId, familyId, R1.hash);
      // Mark R1 rotated with R2's new hash.
      await store.markRotated(R1.row.id, R2.hash);
      expect((await store.findByHash(R1.hash))?.status).toBe('rotated');
      expect((await store.findByHash(R2.hash))?.status).toBe('issued');

      // Revoke the whole family.
      await store.revokeFamily(familyId);

      const r1After = await store.findByHash(R1.hash);
      const r2After = await store.findByHash(R2.hash);
      expect(r1After?.status).toBe('revoked');
      expect(r2After?.status).toBe('revoked');
    });
  });

  describe('Argon2PasswordHasher', () => {
    it('hashes plaintext then verifies the roundtrip (and rejects a wrong password)', async () => {
      const hasher = new Argon2PasswordHasher();
      const plaintext = 'correcthorse1';
      const digest = await hasher.hash(plaintext);

      expect(digest).not.toBe(plaintext); // never plaintext
      expect(digest.length).toBeGreaterThan(20);
      expect(await hasher.verify(plaintext, digest)).toBe(true);
      expect(await hasher.verify('wrongpassword1', digest)).toBe(false);
    });
  });

  describe('JwtTokenSigner', () => {
    it('signs and verifies an access token roundtrip, and rejects garbage', () => {
      const signer = new JwtTokenSigner();
      const token = signer.signAccess({ userId: 'user-xyz' });
      expect(signer.verifyAccess(token)).toEqual({ userId: 'user-xyz' });
      expect(() => signer.verifyAccess('not.a.jwt')).toThrow();
    });

    it('produces a refresh token whose hash is deterministic via hashOf', () => {
      const signer = new JwtTokenSigner();
      const { token, hash } = signer.signRefresh();
      expect(token).not.toBe(hash); // token and its storage hash differ
      expect(signer.hashOf(token)).toBe(hash); // same hash on re-presentation
    });
  });
});