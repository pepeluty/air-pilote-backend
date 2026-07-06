/**
 * UserRepositoryAdapter — MikroORM implementation of the identity
 * {@link UserRepository} port AND the shared-kernel {@link UserExists}
 * read-model (design Decision #5, CRITICAL).
 *
 * The same adapter serves both: the use cases call the write methods
 * (findByEmail/save/findById), and the global AuthGuard calls
 * `exists(userId)` for the cross-context user-existence check that prevents a
 * deleted-user token from leaking a FK 500 into game-records.
 *
 * Infrastructure layer: framework allowed (NestJS + MikroORM).
 */
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { UserExists } from '@shared/UserExists.port';
import { UserRepository } from '../../application/ports/UserRepository.port';
import { User } from '../../domain/User';
import { UserEntity } from './UserEntity';
import { UserMapper } from './mappers';

@Injectable()
export class UserRepositoryAdapter implements UserRepository, UserExists {
  constructor(private readonly em: EntityManager) {}

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.em.findOne(UserEntity, { email });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.em.findOne(UserEntity, { id });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async save(user: User): Promise<void> {
    const entity = UserMapper.toPersistence(user);
    this.em.persist(entity);
    await this.em.flush();
  }

  /** UserExists read-model — idempotent side-effect-free existence check. */
  async exists(userId: string): Promise<boolean> {
    const found = await this.em.findOne(
      UserEntity,
      { id: userId },
      { fields: ['id'] },
    );
    return found !== null;
  }
}
