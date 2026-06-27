/**
 * Score VO + GameRecord aggregate — unit tests (task 4.3; spec
 * backend-game-records: "Persist Game Record" / "Negative score rejected").
 *
 * Domain-layer spec: imports only domain + @shared/errors (layer-guard clean —
 * no @nestjs / @mikro-orm / infrastructure / application imports here).
 */
import { ValidationError } from '@shared/errors';
import { GameRecord } from '../GameRecord';
import { Score } from '../vo/Score';

describe('Score value object (non-negative invariant)', () => {
  it('accepts zero', () => {
    expect(Score.create(0).value).toBe(0);
  });

  it('accepts a positive score', () => {
    expect(Score.create(100).value).toBe(100);
  });

  it('rejects a negative score with ValidationError', () => {
    expect(() => Score.create(-5)).toThrow(ValidationError);
  });

  it('rejects a non-finite number with ValidationError', () => {
    expect(() => Score.create(Number.NaN)).toThrow(ValidationError);
  });

  it('is value-based equal', () => {
    expect(Score.create(42).equals(Score.create(42))).toBe(true);
    expect(Score.create(42).equals(Score.create(7))).toBe(false);
  });
});

describe('GameRecord aggregate', () => {
  it('creates a valid aggregate with all fields and a server-assigned id/timestamp', () => {
    const record = GameRecord.create('user-1', Score.create(1200), 45_000);

    expect(record.userId).toBe('user-1');
    expect(record.score.value).toBe(1200);
    expect(record.durationMs).toBe(45_000);
    expect(record.id).toBeTruthy();
    expect(record.timestamp).toBeInstanceOf(Date);
  });

  it('rejects a negative score before constructing (delegates to the Score VO)', () => {
    // GameRecord.create receives a Score VO built OUTSIDE; the negative guard
    // fires at Score.create time (the use-case edge), so we assert that path.
    expect(() => Score.create(-5)).toThrow(ValidationError);
    // A pre-built non-negative Score passes through cleanly.
    const record = GameRecord.create('user-1', Score.create(3000), 10_000);
    expect(record.score.value).toBe(3000);
  });

  it('rejects an empty userId', () => {
    expect(() => GameRecord.create('', Score.create(0), 1_000)).toThrow();
  });

  it('rejects a negative durationMs', () => {
    expect(() => GameRecord.create('user-1', Score.create(0), -1)).toThrow();
  });

  it('rehydrate round-trips the aggregate without re-validating invariants', () => {
    const ts = new Date('2026-01-01T00:00:00Z');
    const record = GameRecord.rehydrate({
      id: 'rec-1',
      userId: 'user-1',
      score: Score.create(100),
      durationMs: 1_000,
      timestamp: ts,
    });
    expect(record.id).toBe('rec-1');
    expect(record.score.value).toBe(100);
    expect(record.timestamp).toBe(ts);
  });
});