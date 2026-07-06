/**
 * GameRecordsModule — NestJS DynamicModule wiring the game-records context
 * (design: hexagonal per bounded context).
 *
 * Wiring:
 *   - MikroORM feature: GameRecordEntity registered so the EntityManager
 *     resolves the `game_records` table.
 *   - Adapter: GameRecordRepositoryAdapter implements the application
 *     {@link GameRecordRepository} port.
 *   - JetTypesModule: IMPORTED so the {@link JET_TYPE_EXISTS} token is
 *     available for injection into `PersistGameRecord` (design Decision #7 +
 *     data flow d). game-records depends on jet-types' EXPORTED
 *     `JetTypeExists` read-model — no other cross-context coupling; the token
 *     is pulled into this module's DI scope purely to satisfy
 *     `PersistGameRecord`'s constructor.
 *   - Use cases: the application use cases are framework-agnostic plain TS
 *     classes (no @nestjs decorators, no @Inject — layer-guard clean). They
 *     are instantiated here via `useFactory` with their port dependencies
 *     injected (the local adapter + the jet-types `JET_TYPE_EXISTS` port for
 *     `PersistGameRecord`), then exposed by class token so the
 *     GameRecordsController can inject them.
 *   - Controller: GameRecordsController (all routes protected — the global
 *     AuthGuard from AppModule handles auth + UserExists existence check).
 *
 * Infrastructure layer: framework allowed (NestJS + MikroORM).
 */
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JetTypesModule } from '@contexts/jet-types/infrastructure/nest-jet-types.module';
import { JET_TYPE_EXISTS } from '@contexts/jet-types/application/ports/JetTypeExists.port';
import type { JetTypeExists } from '@contexts/jet-types/application/ports/JetTypeExists.port';
import { GetHighScore } from '../application/usecases/GetHighScore';
import { ListGameRecords } from '../application/usecases/ListGameRecords';
import { PersistGameRecord } from '../application/usecases/PersistGameRecord';
import { GameRecordsController } from './controllers/GameRecordsController';
import { GameRecordRepositoryAdapter } from './persistence/GameRecordRepositoryAdapter';
import { GameRecordEntity } from './persistence/GameRecordEntity';

@Module({
  imports: [MikroOrmModule.forFeature([GameRecordEntity]), JetTypesModule],
  controllers: [GameRecordsController],
  providers: [
    // --- adapter ---
    GameRecordRepositoryAdapter,

    // --- use cases (plain TS classes, instantiated with port deps) ---
    {
      provide: PersistGameRecord,
      useFactory: (repository: GameRecordRepositoryAdapter, jetTypeExists: JetTypeExists) =>
        new PersistGameRecord(repository, jetTypeExists),
      inject: [GameRecordRepositoryAdapter, JET_TYPE_EXISTS],
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