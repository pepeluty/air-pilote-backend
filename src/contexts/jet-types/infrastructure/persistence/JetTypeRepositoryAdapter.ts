/**
 * JetTypeRepositoryAdapter — MikroORM implementation of the jet-types
 * {@link JetTypeRepository} port AND the cross-context
 * {@link JetTypeExists} port (design Decision #2: Data Mapper + UoW).
 *
 * A single adapter satisfies BOTH ports (mirrors the identity context's
 * UserRepositoryAdapter also binding USER_EXISTS, project-bootstrap Decision
 * #5): the jet-types module binds this class to JET_TYPE_REPOSITORY and
 * JET_TYPE_EXISTS via `useExisting` and exports JET_TYPE_EXISTS so
 * game-records' PersistGameRecord can reject unknown jetTypeId with a clean
 * 422 ValidationError (no FK 500).
 *
 * - `findAll`: all seeded jet types (backs the public GET /jet-types catalog).
 * - `findById`: one jet type by id, or null (catalog read).
 * - `exists`: boolean id-presence check (FK validation read) — resolved via
 *   count so it stays a side-effect-free read.
 *
 * Seed-only: no save/update/delete is exposed in this change.
 *
 * Infrastructure layer: framework allowed (NestJS + MikroORM).
 */
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { JetTypeExists } from '../../application/ports/JetTypeExists.port';
import { JetTypeRepository } from '../../application/ports/JetTypeRepository.port';
import { JetType } from '../../domain/JetType';
import { JetTypeEntity } from './JetTypeEntity';
import { JetTypeMapper } from './mappers';

@Injectable()
export class JetTypeRepositoryAdapter
  implements JetTypeRepository, JetTypeExists
{
  constructor(private readonly em: EntityManager) {}

  async findAll(): Promise<JetType[]> {
    const entities = await this.em.find(JetTypeEntity, {});
    return entities.map((e) => JetTypeMapper.toDomain(e));
  }

  async findById(id: string): Promise<JetType | null> {
    const entity = await this.em.findOne(JetTypeEntity, { id });
    return entity ? JetTypeMapper.toDomain(entity) : null;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.em.count(JetTypeEntity, { id });
    return count > 0;
  }
}
