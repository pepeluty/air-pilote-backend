/**
 * RegisterUser + LoginUser — unit tests with in-memory fakes
 * (task 4.1; spec backend-identity: Registration, Login, Password Hashing Port).
 *
 * Tests BEHAVIOR via the application ports only — no NestJS, no MikroORM.
 * Fakes implement the ports and record interactions so assertions can verify
 * "plaintext never persisted" (a user is saved with the hashed password, never
 * the raw input) and the success/error branches of both use cases.
 */
import { randomUUID } from 'node:crypto';
import {
  DuplicateEmailError,
  InvalidCredentialsError,
  PasswordStrengthError,
} from '@shared/errors';
import { LoginUser } from '../LoginUser';
import { RefreshToken } from '../RefreshToken';
import { Logout } from '../Logout';
import { RegisterUser } from '../RegisterUser';
import type { PasswordHasher } from '../../ports/PasswordHasher.port';
import type { RefreshTokenStore } from '../../ports/RefreshTokenStore.port';
import type { TokenSigner } from '../../ports/TokenSigner.port';
import type { UserRepository } from '../../ports/UserRepository.port';
import type { LockHandle, RefreshTokenRow } from '../../ports/types';
import { User } from '../../../domain/User';
import { Email } from '../../../domain/vo/Email';

// --- in-memory fakes implementing the identity ports ---

class FakeUserRepository implements UserRepository {
  readonly byId = new Map<string, User>();
  readonly byEmail = new Map<string, User>();
  saveCalls: User[] = [];
  findByEmailCalls: string[] = [];
  async save(user: User): Promise<void> {
    this.saveCalls.push(user);
    this.byId.set(user.id, user);
    this.byEmail.set(user.email.value, user);
  }
  async findByEmail(email: string): Promise<User | null> {
    this.findByEmailCalls.push(email);
    return this.byEmail.get(email) ?? null;
  }
  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
}

class FakePasswordHasher implements PasswordHasher {
  hashCalls: string[] = [];
  verifyCalls: { plaintext: string; hash: string }[] = [];
  async hash(plaintext: string): Promise<string> {
    this.hashCalls.push(plaintext);
    return `hashed$${plaintext}`; // distinct from plaintext — never the raw input
  }
  async verify(plaintext: string, hash: string): Promise<boolean> {
    this.verifyCalls.push({ plaintext, hash });
    return hash === `hashed$${plaintext}`;
  }
}

class FakeTokenSigner implements TokenSigner {
  signAccessCalls = 0;
  signRefreshCalls = 0;
  private seq = 0;
  signAccess(payload: { userId: string }): string {
    this.signAccessCalls += 1;
    return `access:${payload.userId}:${this.seq++}`;
  }
  signRefresh(): { token: string; hash: string } {
    this.signRefreshCalls += 1;
    const token = `refresh:${this.seq++}`;
    return { token, hash: this.hashOf(token) };
  }
  verifyAccess(): { userId: string } {
    throw new Error('not used here');
  }
  hashOf(token: string): string {
    return `hashOf:${token}`;
  }
}

class FakeRefreshTokenStore implements RefreshTokenStore {
  readonly rowsByHash = new Map<string, RefreshTokenRow>();
  issueCalls = 0;
  markRotatedCalls = 0;
  revokeFamilyCalls: string[] = [];
  lockAcquired = 0;
  lockReleased = 0;
  async issue(
    userId: string,
    familyId: string,
    parentHash: string | null,
  ): Promise<{ token: string; hash: string; row: RefreshTokenRow }> {
    this.issueCalls += 1;
    const token = `rtoken:${userId}:${this.issueCalls}`;
    const hash = `hashOf:${token}`;
    const row: RefreshTokenRow = {
      id: randomUUID(),
      userId,
      familyId,
      parentTokenHash: parentHash,
      hash,
      status: 'issued',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    };
    this.rowsByHash.set(hash, row);
    return { token, hash, row };
  }
  async findByHash(hash: string): Promise<RefreshTokenRow | null> {
    return this.rowsByHash.get(hash) ?? null;
  }
  async markRotated(): Promise<void> {
    this.markRotatedCalls += 1;
  }
  markRotatedThrow?: Error;
  async markRotatedOrThrow(): Promise<void> {
    if (this.markRotatedThrow) throw this.markRotatedThrow;
    this.markRotatedCalls += 1;
  }
  async revokeFamily(familyId: string): Promise<void> {
    this.revokeFamilyCalls.push(familyId);
    for (const row of this.rowsByHash.values()) {
      if (row.familyId === familyId) row.status = 'revoked';
    }
  }
  async acquireLock(userId: string): Promise<LockHandle> {
    this.lockAcquired += 1;
    return { userId, acquiredAt: Date.now() };
  }
  async releaseLock(): Promise<void> {
    this.lockReleased += 1;
  }
}

// --- harness ---

function makeFakes() {
  const users = new FakeUserRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenSigner();
  const refreshStore = new FakeRefreshTokenStore();
  const register = new RegisterUser(users, hasher, tokens, refreshStore);
  const login = new LoginUser(users, hasher, tokens, refreshStore);
  // also wire the refresh/logout use cases for shared fakes where convenient.
  const refresh = new RefreshToken(tokens, refreshStore);
  const logout = new Logout(tokens, refreshStore);
  return { users, hasher, tokens, refreshStore, register, login, refresh, logout };
}

const EMAIL = 'a@b.co';
const GOOD_PASSWORD = 'correcthorse1'; // 13 chars, has letter + number

describe('RegisterUser', () => {
  it('creates a user, hashes the password, and issues access + refresh tokens', async () => {
    const { register, users, hasher, tokens, refreshStore } = makeFakes();

    const authToken = await register.execute({ email: EMAIL, password: GOOD_PASSWORD });

    // User persisted exactly once.
    expect(users.saveCalls).toHaveLength(1);
    // Password was hashed through the port (never stored as plaintext).
    expect(hasher.hashCalls).toEqual([GOOD_PASSWORD]);
    const saved = users.saveCalls[0];
    expect(saved.passwordHash).toBe(`hashed$${GOOD_PASSWORD}`);
    expect(saved.passwordHash).not.toBe(GOOD_PASSWORD);
    // Email normalized to lowercase.
    expect(saved.email.value).toBe(EMAIL);

    // Tokens issued: one access + one refresh (family root parentHash=null).
    expect(tokens.signAccessCalls).toBe(1);
    expect(refreshStore.issueCalls).toBe(1);
    expect(authToken.accessToken.length).toBeGreaterThan(0);
    expect(authToken.refreshToken.length).toBeGreaterThan(0);
  });

  it('rejects a duplicate email with DuplicateEmailError and issues no tokens', async () => {
    const fakes = makeFakes();
    // Seed an existing user with this email.
    await fakes.users.save(
      await makeSeededUser(fakes.users, fakes.hasher, EMAIL, 'hunter2pass1'),
    );

    await expect(
      fakes.register.execute({ email: EMAIL, password: GOOD_PASSWORD }),
    ).rejects.toBeInstanceOf(DuplicateEmailError);

    // No second save, no hashing for the rejected attempt, no tokens.
    expect(fakes.users.saveCalls).toHaveLength(1);
    expect(fakes.hasher.hashCalls).toHaveLength(1); // only the seed
    expect(fakes.tokens.signAccessCalls).toBe(0);
    expect(fakes.refreshStore.issueCalls).toBe(0);
  });

  it('rejects a weak password with PasswordStrengthError before any I/O', async () => {
    const fakes = makeFakes();
    await expect(
      fakes.register.execute({ email: EMAIL, password: 'abc' }),
    ).rejects.toBeInstanceOf(PasswordStrengthError);

    // Domain edge rejected FIRST — no repo lookup, no save, no hash, no tokens.
    expect(fakes.users.findByEmailCalls).toHaveLength(0);
    expect(fakes.users.saveCalls).toHaveLength(0);
    expect(fakes.hasher.hashCalls).toHaveLength(0);
    expect(fakes.tokens.signAccessCalls).toBe(0);
    expect(fakes.refreshStore.issueCalls).toBe(0);
  });

  it('never persists plaintext (password stored hashed, not as the raw input)', async () => {
    const fakes = makeFakes();
    await fakes.register.execute({ email: EMAIL, password: GOOD_PASSWORD });

    const stored = new Set<string>();
    for (const u of fakes.users.saveCalls) stored.add(u.passwordHash);
    expect(stored.has(GOOD_PASSWORD)).toBe(false);
    expect(stored.has(`hashed$${GOOD_PASSWORD}`)).toBe(true);
  });
});

describe('LoginUser', () => {
  it('issues tokens when credentials match', async () => {
    const fakes = makeFakes();
    await seedUser(fakes, EMAIL, GOOD_PASSWORD);

    const authToken = await fakes.login.execute({ email: EMAIL, password: GOOD_PASSWORD });

    // Verify was called against the stored hash.
    expect(fakes.hasher.verifyCalls).toHaveLength(1);
    expect(fakes.hasher.verifyCalls[0].hash).toBe(`hashed$${GOOD_PASSWORD}`);
    // A fresh family is issued (new familyId, parentHash=null) — login starts a chain.
    expect(fakes.tokens.signAccessCalls).toBe(1);
    expect(fakes.refreshStore.issueCalls).toBe(1);
    expect(authToken.accessToken.length).toBeGreaterThan(0);
    expect(authToken.refreshToken.length).toBeGreaterThan(0);
  });

  it('rejects a wrong password with InvalidCredentialsError and issues no tokens', async () => {
    const fakes = makeFakes();
    await seedUser(fakes, EMAIL, GOOD_PASSWORD);

    await expect(
      fakes.login.execute({ email: EMAIL, password: 'wrongpassword1' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(fakes.hasher.verifyCalls).toHaveLength(1);
    expect(fakes.tokens.signAccessCalls).toBe(0);
    expect(fakes.refreshStore.issueCalls).toBe(0);
  });

  it('rejects an unknown user with the same generic error (no user enumeration)', async () => {
    const fakes = makeFakes();
    await expect(
      fakes.login.execute({ email: 'nobody@d.co', password: GOOD_PASSWORD }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    // verify must not run for a non-existent user (constant-time per-user only).
    expect(fakes.hasher.verifyCalls).toHaveLength(0);
    expect(fakes.tokens.signAccessCalls).toBe(0);
    expect(fakes.refreshStore.issueCalls).toBe(0);
  });
});

// --- helpers ---

/** Hash + persist a user via the shared fakes so login has something to find. */
async function seedUser(
  fakes: ReturnType<typeof makeFakes>,
  email: string,
  password: string,
): Promise<void> {
  const hashed = await fakes.hasher.hash(password);
  await fakes.users.save(User.create(randomUUID(), Email.create(email), hashed));
}

/** Build a domain User already hashed for seeding pre-existing accounts. */
async function makeSeededUser(
  _users: FakeUserRepository,
  hasher: FakePasswordHasher,
  email: string,
  password: string,
): Promise<User> {
  const hashed = await hasher.hash(password);
  return User.create(randomUUID(), Email.create(email), hashed);
}