/**
 * Mappers between the ORM {@link GameRecordEntity} and the domain
 * {@link GameRecord} aggregate. Infrastructure layer.
 *
 * The domain Score value object is reconstructed from the stored integer via
 * {@link Score.create} on the way in (the stored score is always non-negative
 * — it was validated at persist time — so reconstruction cannot throw).
 * `jetTypeId` is carried verbatim in both directions (validated upstream by
 * the `JetTypeExists` port in `PersistGameRecord`).
 */
import { GameRecord } from '../../domain/GameRecord';
import { Score } from '../../domain/vo/Score';
import { GameRecordEntity } from './GameRecordEntity';

export class GameRecordMapper {
  static toDomain(entity: GameRecordEntity): GameRecord {
    return GameRecord.rehydrate({
      id: entity.id,
      userId: entity.userId,
      jetTypeId: entity.jetTypeId,
      score: Score.create(entity.score),
      durationMs: entity.durationMs,
      timestamp: entity.timestamp,
    });
  }

  static toPersistence(record: GameRecord, target?: GameRecordEntity): GameRecordEntity {
    const entity = target ?? new GameRecordEntity();
    entity.id = record.id;
    entity.userId = record.userId;
    entity.jetTypeId = record.jetTypeId;
    entity.score = record.score.value;
    entity.durationMs = record.durationMs;
    entity.timestamp = record.timestamp;
    return entity;
  }
}