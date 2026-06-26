/**
 * GameRecordEntity — MikroORM persistence entity for the GameRecord aggregate
 * (design Decision #2: Data Mapper + UoW). Maps to the `game_records` table.
 *
 * The domain {@link GameRecord} aggregate holds a {@link Score} value object;
 * this entity stores the score as a plain integer. Conversion is handled by
 * {@link GameRecordMapper} (infrastructure) so the domain never sees ORM
 * types.
 *
 * Infrastructure layer: framework allowed (MikroORM decorators). Column names
 * follow snake_case via the UnderscoreNamingStrategy configured in AppModule.
 */
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'game_records' })
export class GameRecordEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property()
  userId!: string;

  @Property()
  score!: number;

  @Property()
  durationMs!: number;

  @Property()
  timestamp!: Date;
}