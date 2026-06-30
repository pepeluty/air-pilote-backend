/**
 * JetTypeEntity — MikroORM persistence entity for the JetType aggregate
 * (design Decision #2: Data Mapper + UoW). Maps to the `jet_types` table.
 *
 * The domain {@link JetType} aggregate holds five stat value objects; this
 * entity stores each stat as a plain number. Conversion is handled by
 * {@link JetTypeMapper} (infrastructure) so the domain never sees ORM types.
 * Seed-only: the three rows are inserted by Migration20260626000002 with
 * FIXED UUIDs (design Decision #2) — there is no write path in this change.
 *
 * `accelerationRate` is numeric (the k coefficient is fractional: 4.0/5.0/6.0
 * per SECOND, design Decision #3 — NOT the exploration's per-ms draft).
 *
 * Infrastructure layer: framework allowed (MikroORM decorators). Column names
 * follow snake_case via the UnderscoreNamingStrategy configured in AppModule
 * (maxSpeed -> max_speed, cruiseSpeed -> cruise_speed, accelerationRate ->
 * acceleration_rate).
 */
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'jet_types' })
export class JetTypeEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property()
  name!: string;

  @Property()
  maxSpeed!: number;

  @Property()
  cruiseSpeed!: number;

  @Property()
  accelerationRate!: number;

  @Property()
  defense!: number;

  @Property()
  damage!: number;

  @Property()
  rotationSpeed!: number;
}
