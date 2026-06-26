/**
 * ListGameRecords — list the authenticated player's own records ordered
 * most-recent first, with optional pagination (spec: "List Game Records by
 * User").
 *
 * The userId is ALWAYS the authenticated caller's userId (never from the body
 * or query) — the controller passes it from the verified access token. This
 * guarantees "Cannot access other players' records": there is no path to list
 * another userId's history.
 *
 * Pagination defaults: limit=10, offset=0. Pagination past the end yields an
 * empty items array without error (spec: "Pagination past the end").
 *
 * Application layer: framework-agnostic — depends only on ports + domain.
 */
import { UseCase } from '@shared/application/UseCase';
import { GameRecord } from '../../domain/GameRecord';
import {
  GameRecordRepository,
  Page,
  PageOpts,
} from '../ports/GameRecordRepository.port';

export interface ListGameRecordsCommand {
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListGameRecords extends UseCase<
  ListGameRecordsCommand,
  Page<GameRecord>
> {
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly DEFAULT_OFFSET = 0;

  constructor(private readonly repository: GameRecordRepository) {
    super();
  }

  async execute(command: ListGameRecordsCommand): Promise<Page<GameRecord>> {
    const opts: PageOpts = {
      limit: command.limit ?? ListGameRecords.DEFAULT_LIMIT,
      offset: command.offset ?? ListGameRecords.DEFAULT_OFFSET,
    };
    return this.repository.listByUser(command.userId, opts);
  }
}