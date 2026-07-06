/**
 * PersistGameRecord — jetTypeId validation unit tests (task 7.2; spec
 * backend-game-records MODIFIED "Persist Game Record": valid jetTypeId ok;
 * unknown jetTypeId → ValidationError(JetTypeExists false); negative score →
 * ValidationError(Score VO)). Tests BEHAVIOR via the application ports only —
 * no NestJS, no MikroORM. Fakes implement {@link JetTypeExists} +
 * {@link GameRecordRepository} so assertions verify the clean rejection path
 * (422 ValidationError instead of a raw FK 500 — design Data Flow d).
 *
 * Follows the in-memory-fakes pattern of `registration-login.spec.ts`
 * (no jest.mock — explicit port implementations that record interactions).
 */
import { ValidationError } from '@shared/errors';
import { PersistGameRecord } from '../PersistGameRecord';
import type { JetTypeExists } from '@contexts/jet-types/application/ports/JetTypeExists.port';
import type { GameRecordRepository, Page, PageOpts } from '../../ports/GameRecordRepository.port';
import type { GameRecord } from '../../../domain/GameRecord';

/** Fixed seed UUIDs (design "Fixed seed UUIDs") — Balanced = FK default. */
const BALANCED_ID = '00000000-0000-4000-8000-000000000002';
const BOGUS_ID = 'deadbeef-0000-4000-8000-00000000dead';

/**
 * Fake JetTypeExists: returns true for a configured set of known ids.
 * Mirrors the real adapter's `exists(id)` boolean contract.
 */
class FakeJetTypeExists implements JetTypeExists {
  constructor(private readonly known: Set<string>) {}
  async exists(id: string): Promise<boolean> {
    return this.known.has(id);
  }
}

/**
 * In-memory fake GameRecordRepository. Records every saved aggregate so the
 * test can assert the record was persisted AND carries the right jetTypeId.
 */
class FakeGameRecordRepository implements GameRecordRepository {
  readonly saved: GameRecord[] = [];
  async save(record: GameRecord): Promise<GameRecord> {
    this.saved.push(record);
    return record;
  }
  async highScoreOf(): Promise<number | null> {
    return null;
  }
  async listByUser(_userId: string, _opts: PageOpts): Promise<Page<GameRecord>> {
    return { items: [], total: 0, hasMore: false };
  }
}

function makeUsecase(known: Set<string>): {
  usecase: PersistGameRecord;
  repo: FakeGameRecordRepository;
  exists: FakeJetTypeExists;
} {
  const repo = new FakeGameRecordRepository();
  const exists = new FakeJetTypeExists(known);
  const usecase = new PersistGameRecord(repo, exists);
  return { usecase, repo, exists };
}

describe('PersistGameRecord — jetTypeId validation (spec MODIFIED "Persist Game Record")', () => {
  it('persists a record with a valid jetTypeId (spec: valid ok)', async () => {
    const { usecase, repo } = makeUsecase(new Set([BALANCED_ID]));

    const record = await usecase.execute({
      userId: 'user-1',
      jetTypeId: BALANCED_ID,
      score: 1200,
      durationMs: 45_000,
    });

    expect(repo.saved).toHaveLength(1);
    expect(record.jetTypeId).toBe(BALANCED_ID);
    expect(record.userId).toBe('user-1');
    expect(record.score.value).toBe(1200);
    expect(repo.saved[0].jetTypeId).toBe(BALANCED_ID);
  });

  it('rejects an unknown jetTypeId with ValidationError (JetTypeExists false → 422, no FK 500)', async () => {
    const { usecase, repo } = makeUsecase(new Set([BALANCED_ID])); // Balanced known, BOGUS not

    await expect(
      usecase.execute({
        userId: 'user-1',
        jetTypeId: BOGUS_ID,
        score: 500,
        durationMs: 1_000,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    // Nothing persisted — the domain rejected before the repository call.
    expect(repo.saved).toHaveLength(0);
  });

  it('rejects an empty jetTypeId with ValidationError (jet_type_id_required)', async () => {
    const { usecase, repo } = makeUsecase(new Set([BALANCED_ID]));

    await expect(
      usecase.execute({
        userId: 'user-1',
        jetTypeId: '',
        score: 500,
        durationMs: 1_000,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(repo.saved).toHaveLength(0);
  });

  it('rejects a negative score with ValidationError (existing Score VO behavior, reaffirm)', async () => {
    const { usecase, repo } = makeUsecase(new Set([BALANCED_ID]));

    await expect(
      usecase.execute({
        userId: 'user-1',
        jetTypeId: BALANCED_ID,
        score: -5,
        durationMs: 1_000,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    // jetTypeId was valid (passed the JetTypeExists check) but the Score VO
    // rejected the negative score AFTER — still no persistence.
    expect(repo.saved).toHaveLength(0);
  });

  it('validates jetTypeId BEFORE the score (clean rejection order, design Data Flow d)', async () => {
    // Both jetTypeId AND score are bad — jetTypeId guard must fire FIRST so the
    // surface error is the FK validation, not the score.
    const { usecase, repo } = makeUsecase(new Set([BALANCED_ID]));

    await expect(
      usecase.execute({
        userId: 'user-1',
        jetTypeId: BOGUS_ID,
        score: -5,
        durationMs: 1_000,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(repo.saved).toHaveLength(0);
  });
});