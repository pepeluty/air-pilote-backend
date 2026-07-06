/**
 * Mappers between ORM entities, domain aggregates/entities, and the
 * {@link RefreshTokenRow} port projection. Infrastructure layer.
 */
import { Email } from '../../domain/vo/Email';
import { RefreshToken, RefreshTokenStatus } from '../../domain/RefreshToken';
import { User } from '../../domain/User';
import type { RefreshTokenRow } from '../../application/ports/types';
import { RefreshTokenEntity } from './RefreshTokenEntity';
import { UserEntity } from './UserEntity';

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    return User.rehydrate({
      id: entity.id,
      email: Email.create(entity.email),
      passwordHash: entity.passwordHash,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(user: User, target?: UserEntity): UserEntity {
    const entity = target ?? new UserEntity();
    entity.id = user.id;
    entity.email = user.email.value;
    entity.passwordHash = user.passwordHash;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;
    return entity;
  }
}

export class RefreshTokenMapper {
  static toDomain(entity: RefreshTokenEntity): RefreshToken {
    return RefreshToken.rehydrate({
      id: entity.id,
      userId: entity.userId,
      familyId: entity.familyId,
      parentTokenHash: entity.parentTokenHash,
      hash: entity.hash,
      status: entity.status as RefreshTokenStatus,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
    });
  }

  static toRow(entity: RefreshTokenEntity): RefreshTokenRow {
    return {
      id: entity.id,
      userId: entity.userId,
      familyId: entity.familyId,
      parentTokenHash: entity.parentTokenHash,
      hash: entity.hash,
      status: entity.status as RefreshTokenStatus,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
    };
  }
}
