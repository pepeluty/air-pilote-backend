/**
 * GameRecordsModule — NestJS DynamicModule wiring the game-records context
 * (design: hexagonal per bounded context).
 *
 * Wiring:
 *   - MikroORM feature: GameRecordEntity registered so the EntityManager
 *     resolves the `game_records` table.
 *   - Adapter: GameRecordRepositoryAdapter implements the application
 *     {@link GameRecordRepository} port.
 *   - Use cases: the application use cases are framework-agnostic plain TS
 *     classes (no @nestjs decorators, no @Inject — layer-guard clean). They
 *     are instantiated here via `useFactory` with their port dependency (the
 *     adapter) injected by concrete class token, then exposed by class token
 *     so the GameRecordsController can inject them.
 *   - Controller: GameRecordsController (all routes protected — the global
 *     AuthGuard from AppModule handles auth + UserExists existence check).
 *
 * Infrastructure layer: framework allowed (NestJS + MikroORM).
 */
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { GetHighScore } from '../application/usecases/GetHighScore';
import { ListGameRecords } from '../application/usecases/ListGameRecords';
import { PersistGameRecord } from '../application/usecases/PersistGameRecord';
import { GameRecordsController } from './controllers/GameRecordsController';
import { GameRecordRepositoryAdapter } from './persistence/GameRecordRepositoryAdapter';
import { GameRecordEntity } from './persistence/GameRecordEntity';

@Module({
  imports: [MikroOrmModule.forFeature([GameRecordEntity])],
  controllers: [GameRecordsController],
  providers: [
    // --- adapter ---
    GameRecordRepositoryAdapter,

    // --- use cases (plain TS classes, instantiated with port deps) ---
    {
      provide: PersistGameRecord,
      useFactory: (repository: GameRecordRepositoryAdapter) =>
        new PersistGameRecord(repository),
      inject: [GameRecordRepositoryAdapter],
    },
    {
      provide: GetHighScore,
      useFactory: (repository: GameRecordRepositoryAdapter) =>
        new GetHighScore(repository),
      inject: [GameRecordRepositoryAdapter],
    },
    {
      provide: ListGameRecords,
      useFactory: (repository: GameRecordRepositoryAdapter) =>
        new ListGameRecords(repository),
      inject: [GameRecordRepositoryAdapter],
    },
  ],
  exports: [PersistGameRecord, GetHighScore, ListGameRecords],
})
export class GameRecordsModule {}