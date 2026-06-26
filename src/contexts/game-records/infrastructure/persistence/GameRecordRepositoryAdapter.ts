/**
 * GameRecordRepositoryAdapter — MikroORM implementation of the game-records
 * {@link GameRecordRepository} port (design Decision #2: Data Mapper + UoW).
 *
 * - `save`: persists + flushes the entity, returns the saved aggregate.
 * - `highScoreOf`: the player's maximum score, or null when there are no
 *   records for that user (spec: "No records exist"). Resolved by the
 *   highest-score row rather than a SQL aggregate so the adapter stays simple
 *   and type-safe (only the `score` field is selected).
 * - `listByUser`: the player's records ordered most-recent first, sliced by
 *   limit/offset, with `total` and `hasMore` for pagination (spec: paginated
 *   history + "Pagination past the end").
 *
 * All reads are scoped to a single userId — there is no cross-user query
 * surface, satisfying "Cannot access other players' records".
 *
 * Infrastructure layer: framework allowed (NestJS + MikroORM).
 */
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { GameRecord } from '../../domain/GameRecord';
import { GameRecordRepository, Page, PageOpts } from '../../application/ports/GameRecordRepository.port';
import { GameRecordEntity } from './GameRecordEntity';
import { GameRecordMapper } from './mappers';

@Injectable()
export class GameRecordRepositoryAdapter implements GameRecordRepository {
  constructor(private readonly em: EntityManager) {}

  async save(record: GameRecord): Promise<GameRecord> {
    const entity = GameRecordMapper.toPersistence(record);
    this.em.persist(entity);
    await this.em.flush();
    return GameRecordMapper.toDomain(entity);
  }

  async highScoreOf(userId: string): Promise<number | null> {
    const row = await this.em.findOne(
      GameRecordEntity,
      { userId },
      { orderBy: { score: 'DESC' }, fields: ['score'] },
    );
    return row ? row.score : null;
  }

  async listByUser(userId: string, opts: PageOpts): Promise<Page<GameRecord>> {
    const [items, total] = await Promise.all([
      this.em.find(
        GameRecordEntity,
        { userId },
        {
          orderBy: { timestamp: 'DESC' },
          limit: opts.limit,
          offset: opts.offset,
        },
      ),
      this.em.count(GameRecordEntity, { userId }),
    ]);

    return {
      items: items.map((e) => GameRecordMapper.toDomain(e)),
      total,
      hasMore: opts.offset + items.length < total,
    };
  }
}