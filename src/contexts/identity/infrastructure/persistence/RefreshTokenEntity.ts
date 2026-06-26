/**
 * RefreshTokenEntity — MikroORM persistence entity for a refresh-token row.
 * Maps to the `refresh_tokens` table.
 *
 * Stores the storage `hash` (never the raw token), the family chain via
 * `familyId` + `parentTokenHash`, and the state-machine `status`
 * (`issued | rotated | revoked` — design W1). Conversion to/from the domain
 * {@link RefreshToken} and the {@link RefreshTokenRow} projection is handled by
 * the store adapter + mappers.
 *
 * Infrastructure layer: framework allowed (MikroORM decorators). Column names
 * follow snake_case via the UnderscoreNamingStrategy configured in AppModule.
 */
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'refresh_tokens' })
export class RefreshTokenEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ index: true })
  userId!: string;

  @Property({ index: true })
  familyId!: string;

  @Property({ nullable: true })
  parentTokenHash!: string | null;

  @Property({ unique: true })
  hash!: string;

  @Property()
  status!: string;

  @Property()
  expiresAt!: Date;

  @Property()
  createdAt!: Date;
}
