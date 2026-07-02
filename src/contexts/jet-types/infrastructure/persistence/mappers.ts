/**
 * Mappers between the ORM {@link JetTypeEntity} and the domain
 * {@link JetType} aggregate. Infrastructure layer.
 *
 * The domain stat value objects are reconstructed from the stored numbers via
 * their `create` factories on the way in (the stored stats are always valid
 * — they were seeded by the migration with the authoritative values and are
 * immutable in this change — so reconstruction cannot throw).
 *
 * Numeric coercion (PR 7 test fix): the `acceleration_rate` column is
 * `numeric` (design Decision #3 — k is fractional: 4.0/5.0/6.0). The pg driver
 * returns `numeric`/`decimal` columns as STRINGS to preserve precision, so
 * `entity.accelerationRate` is a string at runtime even though the TS type is
 * `number`. The VO factories reject non-numbers (`acceleration_rate_required`),
 * so the mapper coerces every stat through `Number(...)` before handing it to
 * the VO. The integer columns (max_speed, cruise_speed, defense, damage) come
 * back as numbers already, but `Number()` is a no-op on a number — defensive
 * against future column-type drift. This was caught by the jet-types
 * integration spec (task 7.3) against a real Postgres testcontainer.
 */
import { JetType } from '../../domain/JetType';
import { AccelerationRate } from '../../domain/vo/AccelerationRate';
import { CruiseSpeed } from '../../domain/vo/CruiseSpeed';
import { Damage } from '../../domain/vo/Damage';
import { Defense } from '../../domain/vo/Defense';
import { LockDelay } from '../../domain/vo/LockDelay';
import { MissileDamage } from '../../domain/vo/MissileDamage';
import { MissileLifetime } from '../../domain/vo/MissileLifetime';
import { MissileSpeed } from '../../domain/vo/MissileSpeed';
import { MissileTurnRate } from '../../domain/vo/MissileTurnRate';
import { RadarAngle } from '../../domain/vo/RadarAngle';
import { RadarRange } from '../../domain/vo/RadarRange';
import { RotationSpeed } from '../../domain/vo/RotationSpeed';
import { Speed } from '../../domain/vo/Speed';
import { JetTypeEntity } from './JetTypeEntity';

export class JetTypeMapper {
  static toDomain(entity: JetTypeEntity): JetType {
    return JetType.rehydrate({
      id: entity.id,
      name: entity.name,
      maxSpeed: Speed.create(Number(entity.maxSpeed)),
      cruiseSpeed: CruiseSpeed.create(Number(entity.cruiseSpeed)),
      accelerationRate: AccelerationRate.create(Number(entity.accelerationRate)),
      defense: Defense.create(Number(entity.defense)),
      damage: Damage.create(Number(entity.damage)),
      rotationSpeed: RotationSpeed.create(Number(entity.rotationSpeed)),
      lockDelay: LockDelay.create(Number(entity.lockDelay)),
      radarRange: RadarRange.create(Number(entity.radarRange)),
      radarAngle: RadarAngle.create(Number(entity.radarAngle)),
      missileSpeed: MissileSpeed.create(Number(entity.missileSpeed)),
      missileTurnRate: MissileTurnRate.create(Number(entity.missileTurnRate)),
      missileLifetime: MissileLifetime.create(Number(entity.missileLifetime)),
      missileDamage: MissileDamage.create(Number(entity.missileDamage)),
    });
  }

  static toPersistence(jetType: JetType, target?: JetTypeEntity): JetTypeEntity {
    const entity = target ?? new JetTypeEntity();
    entity.id = jetType.id;
    entity.name = jetType.name;
    entity.maxSpeed = jetType.maxSpeed.value;
    entity.cruiseSpeed = jetType.cruiseSpeed.value;
    entity.accelerationRate = jetType.accelerationRate.value;
    entity.defense = jetType.defense.value;
    entity.damage = jetType.damage.value;
    entity.rotationSpeed = jetType.rotationSpeed.value;
    entity.lockDelay = jetType.lockDelay.value;
    entity.radarRange = jetType.radarRange.value;
    entity.radarAngle = jetType.radarAngle.value;
    entity.missileSpeed = jetType.missileSpeed.value;
    entity.missileTurnRate = jetType.missileTurnRate.value;
    entity.missileLifetime = jetType.missileLifetime.value;
    entity.missileDamage = jetType.missileDamage.value;
    return entity;
  }
}
