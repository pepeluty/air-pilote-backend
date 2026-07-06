/**
 * UserEntity — MikroORM persistence entity for the User aggregate
 * (design Decision #2: Data Mapper + UoW). Maps to the `users` table.
 *
 * The domain {@link User} aggregate holds an {@link Email} value object; this
 * entity stores the email as a plain unique string. Conversion is handled by
 * {@link UserMapper} (infrastructure) so the domain never sees ORM types.
 *
 * Infrastructure layer: framework allowed (MikroORM decorators). Column names
 * follow snake_case via the UnderscoreNamingStrategy configured in AppModule.
 */
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'users' })
export class UserEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  passwordHash!: string;

  @Property()
  createdAt!: Date;

  @Property()
  updatedAt!: Date;
}
