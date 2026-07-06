/**
 * JetTypesModule — NestJS DynamicModule wiring the jet-types context
 * (design: hexagonal per bounded context).
 *
 * Wiring:
 *   - MikroORM feature: JetTypeEntity registered so the EntityManager
 *     resolves the `jet_types` table.
 *   - Adapter: JetTypeRepositoryAdapter implements BOTH the application
 *     {@link JetTypeRepository} port AND the cross-context
 *     {@link JetTypeExists} port (design Decision #2: a single adapter —
 *     mirrors identity's UserRepositoryAdapter also binding USER_EXISTS).
 *   - Shared-kernel port bindings: { provide: JET_TYPE_REPOSITORY,
 *     useExisting: JetTypeRepositoryAdapter }, { provide: JET_TYPE_EXISTS,
 *     useExisting: JetTypeRepositoryAdapter }. JET_TYPE_EXISTS is EXPORTED
 *     so game-records' PersistGameRecord can inject it and reject unknown
 *     jetTypeId with a clean 422 ValidationError instead of leaking a FK
 *     500 (design data flow d).
 *   - Use cases: the application use cases are framework-agnostic plain TS
 *     classes (no @nestjs decorators, no @Inject — layer-guard clean). They
 *     are instantiated here via `useFactory` with their port dependency (the
 *     adapter) injected by concrete class token, then exposed by class token
 *     so the JetTypesController can inject them.
 *   - Controller: JetTypesController (all routes public — `@Public()`
 *     skips the global AuthGuard, spec: "no authentication is required").
 *
 * Infrastructure layer: framework allowed (NestJS + MikroORM).
 */
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JET_TYPE_EXISTS } from '../application/ports/JetTypeExists.port';
import { JET_TYPE_REPOSITORY } from '../application/ports/JetTypeRepository.port';
import { ListJetTypes } from '../application/usecases/ListJetTypes';
import { JetTypesController } from './controllers/JetTypesController';
import { JetTypeRepositoryAdapter } from './persistence/JetTypeRepositoryAdapter';
import { JetTypeEntity } from './persistence/JetTypeEntity';

@Module({
  imports: [MikroOrmModule.forFeature([JetTypeEntity])],
  controllers: [JetTypesController],
  providers: [
    // --- adapter ---
    JetTypeRepositoryAdapter,

    // --- port bindings (single adapter satisfies both ports) ---
    { provide: JET_TYPE_REPOSITORY, useExisting: JetTypeRepositoryAdapter },
    { provide: JET_TYPE_EXISTS, useExisting: JetTypeRepositoryAdapter },

    // --- use cases (plain TS classes, instantiated with port deps) ---
    {
      provide: ListJetTypes,
      useFactory: (repository: JetTypeRepositoryAdapter) =>
        new ListJetTypes(repository),
      inject: [JetTypeRepositoryAdapter],
    },
  ],
  exports: [JET_TYPE_EXISTS, ListJetTypes],
})
export class JetTypesModule {}