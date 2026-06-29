/**
 * PersistGameRecord — persist exactly one completed-game session record
 * (spec MODIFIED "Persist Game Record": now stores `jetTypeId` too).
 *
 * Flow (design data flow d):
 *   1. Reject an unknown `jetTypeId` via the {@link JetTypeExists} port —
 *      throws ValidationError (422) BEFORE any other I/O, mirroring the
 *      shared {@link UserExists} pattern from project-bootstrap Decision #5.
 *      This is the CLEAN rejection path: a 422 ValidationError instead of a
 *      raw FK 500 from the database (design data flow d: "JetTypeExists false
 *      -> ValidationError 422, no FK 500").
 *   2. Build the {@link Score} VO — throws ValidationError on a negative
 *      score (spec: "Negative score rejected").
 *   3. Create the {@link GameRecord} aggregate (id + server timestamp) —
 *      carries `jetTypeId` onto the record.
 *   4. Persist via the {@link GameRecordRepository} port.
 *   5. Return the saved aggregate.
 *
 * The userId is the AUTHENTICATED caller's userId (never the request body);
 * the controller passes it from the verified access token. Non-existent
 * users are rejected earlier by the global AuthGuard's UserExists check
 * (CRITICAL Decision #5), so this use case assumes userId is valid.
 *
 * Application layer: framework-agnostic — depends only on ports + domain.
 */
import { UseCase } from '@shared/application/UseCase';
import { ValidationError } from '@shared/errors';
import { GameRecord } from '../../domain/GameRecord';
import { Score } from '../../domain/vo/Score';
import { GameRecordRepository } from '../ports/GameRecordRepository.port';
import type { JetTypeExists } from '@contexts/jet-types/application/ports/JetTypeExists.port';

export interface PersistGameRecordCommand {
  readonly userId: string;
  readonly jetTypeId: string;
  readonly score: number;
  readonly durationMs: number;
}

export class PersistGameRecord extends UseCase<PersistGameRecordCommand, GameRecord> {
  constructor(
    private readonly repository: GameRecordRepository,
    private readonly jetTypeExists: JetTypeExists,
  ) {
    super();
  }

  async execute(command: PersistGameRecordCommand): Promise<GameRecord> {
    // (1) Reject unknown jetTypeId with a clean 422 ValidationError (no FK 500).
    if (typeof command.jetTypeId !== 'string' || command.jetTypeId.length === 0) {
      throw new ValidationError('jet_type_id_required');
    }
    const jetTypeExists = await this.jetTypeExists.exists(command.jetTypeId);
    if (!jetTypeExists) {
      throw new ValidationError('jet_type_id_not_found');
    }

    // (2) Validate the score at the domain edge — throws ValidationError on negative.
    const score = Score.create(command.score);

    // (3) Create the aggregate (id + server-assigned timestamp) carrying jetTypeId.
    const record = GameRecord.create(
      command.userId,
      command.jetTypeId,
      score,
      command.durationMs,
    );

    // (4)+(5) Persist and return the saved aggregate.
    return this.repository.save(record);
  }
}