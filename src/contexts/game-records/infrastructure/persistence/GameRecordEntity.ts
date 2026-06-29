/**
 * GameRecordEntity — MikroORM persistence entity for the GameRecord aggregate
 * (design Decision #2: Data Mapper + UoW). Maps to the `game_records` table.
 *
 * The domain {@link GameRecord} aggregate holds a {@link Score} value object;
 * this entity stores the score as a plain integer. Conversion is handled by
 * {@link GameRecordMapper} (infrastructure) so the domain never sees ORM
 * types.
 *
 * `jet_type_id` is a NOT NULL FK to `jet_types(id)` added by
 * `Migration20260626000003_game_records_jet_type_fk` (default Balanced UUID
 * for existing rows; new rows are validated by the `JetTypeExists` port in
 * `PersistGameRecord` so they never reach persistence with an unknown id).
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

  @Property({ type: 'uuid', name: 'jet_type_id' })
  jetTypeId!: string;

  @Property()
  score!: number;

  @Property()
  durationMs!: number;

  @Property()
  timestamp!: Date;
}