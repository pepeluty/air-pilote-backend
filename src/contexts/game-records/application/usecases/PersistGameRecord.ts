/**
 * PersistGameRecord — persist exactly one completed-game session record
 * (spec: "Persist Game Record").
 *
 * Flow (design data flow c):
 *   1. Build the {@link Score} VO — throws ValidationError on a negative
 *      score (spec: "Negative score rejected") BEFORE any I/O.
 *   2. Create the {@link GameRecord} aggregate (id + server timestamp).
 *   3. Persist via the {@link GameRecordRepository} port.
 *   4. Return the saved aggregate.
 *
 * The userId is the AUTHENTICATED caller's userId (never the request body);
 * the controller passes it from the verified access token. Non-existent
 * users are rejected earlier by the global AuthGuard's UserExists check
 * (CRITICAL Decision #5), so this use case assumes userId is valid.
 *
 * Application layer: framework-agnostic — depends only on ports + domain.
 */
import { UseCase } from '@shared/application/UseCase';
import { GameRecord } from '../../domain/GameRecord';
import { Score } from '../../domain/vo/Score';
import { GameRecordRepository } from '../ports/GameRecordRepository.port';

export interface PersistGameRecordCommand {
  readonly userId: string;
  readonly score: number;
  readonly durationMs: number;
}

export class PersistGameRecord extends UseCase<PersistGameRecordCommand, GameRecord> {
  constructor(private readonly repository: GameRecordRepository) {
    super();
  }

  async execute(command: PersistGameRecordCommand): Promise<GameRecord> {
    // (1) Validate at the domain edge — throws ValidationError on negative.
    const score = Score.create(command.score);

    // (2) Create the aggregate (id + server-assigned timestamp).
    const record = GameRecord.create(command.userId, score, command.durationMs);

    // (3)+(4) Persist and return the saved aggregate.
    return this.repository.save(record);
  }
}