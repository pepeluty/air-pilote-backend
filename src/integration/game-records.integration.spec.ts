/**
 * Game-records infrastructure — Postgres integration tests (task 4.4; spec
 * backend-game-records). Exercises the REAL MikroORM adapter against a
 * testcontainer Postgres:
 *   - save + read back
 *   - highScoreOf: returns 3000 over 1200/950, null when no records
 *   - listByUser: paginated history — page-2/size-10 empty + past end
 *   - cannot-access-others: listing another userId returns only that user's own
 *
 * Requires Docker; skipped when Docker is unavailable.
 */
import { execSync } from 'node:child_process';
import { GameRecord } from '../contexts/game-records/domain/GameRecord';
import { Score } from '../contexts/game-records/domain/vo/Score';
import { GameRecordRepositoryAdapter } from '../contexts/game-records/infrastructure/persistence/GameRecordRepositoryAdapter';
import { getEm, startDatabase, stopDatabase } from './db-harness';

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

describeOrSkip('Game-records infrastructure (Postgres via testcontainers)', () => {
  beforeAll(async () => {
    await startDatabase();
  });
  afterAll(async () => {
    await stopDatabase();
  });

  it('saves a record and reads it back by the same userId', async () => {
    const repo = new GameRecordRepositoryAdapter(getEm());
    const userId = randomishId();
    const saved = await repo.save(
      GameRecord.create(userId, Score.create(1200), 45_000),
    );
    expect(saved.userId).toBe(userId);
    expect(saved.score.value).toBe(1200);
  });

  it('highScoreOf returns the max (3000 over 1200/950)', async () => {
    const repo = new GameRecordRepositoryAdapter(getEm());
    const userId = randomishId();
    await repo.save(GameRecord.create(userId, Score.create(1200), 10_000));
    await repo.save(GameRecord.create(userId, Score.create(950), 9_000));
    await repo.save(GameRecord.create(userId, Score.create(3000), 12_000));

    expect(await repo.highScoreOf(userId)).toBe(3000);
  });

  it('highScoreOf returns null when the player has no records', async () => {
    const repo = new GameRecordRepositoryAdapter(getEm());
    expect(await repo.highScoreOf(randomishId())).toBeNull();
  });

  it('listByUser returns an empty page when paginated past the end', async () => {
    const repo = new GameRecordRepositoryAdapter(getEm());
    const userId = randomishId();
    // 5 records; requesting offset 10 (page 2 of size 10) is past the end.
    for (let i = 0; i < 5; i++) {
      await repo.save(GameRecord.create(userId, Score.create(i * 100), 1_000));
    }
    const page = await repo.listByUser(userId, { limit: 10, offset: 10 });
    expect(page.items).toHaveLength(0);
    expect(page.total).toBe(5);
    expect(page.hasMore).toBe(false);
  });

  it('listByUser page-2/size-10 is empty also for a user with zero records', async () => {
    const repo = new GameRecordRepositoryAdapter(getEm());
    const page = await repo.listByUser(randomishId(), { limit: 10, offset: 10 });
    expect(page.items).toHaveLength(0);
    expect(page.total).toBe(0);
    expect(page.hasMore).toBe(false);
  });

  it('cannot access other players\' records — listByUser is scoped to the caller only', async () => {
    const repo = new GameRecordRepositoryAdapter(getEm());
    const userA = randomishId();
    const userB = randomishId();
    await repo.save(GameRecord.create(userA, Score.create(777), 1_000));
    await repo.save(GameRecord.create(userB, Score.create(123), 2_000));

    // userB's listing must contain ONLY userB's record — never userA's.
    const pageB = await repo.listByUser(userB, { limit: 100, offset: 0 });
    expect(pageB.items.every((r) => r.userId === userB)).toBe(true);
    expect(pageB.total).toBe(1);
    expect(pageB.items[0].score.value).toBe(123);

    // And userA's high score is invisible to a userB-scoped read.
    expect(await repo.highScoreOf(userB)).toBe(123);
  });
});

/** A plausible UUID-ish unique id without importing crypto in every line. */
function randomishId(): string {
  return '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
}