/**
 * Mappers between the ORM {@link JetTypeEntity} and the domain
 * {@link JetType} aggregate. Infrastructure layer.
 *
 * The domain stat value objects are reconstructed from the stored numbers via
 * their `create` factories on the way in (the stored stats are always valid
 * — they were seeded by the migration with the authoritative values and are
 * immutable in this change — so reconstruction cannot throw).
 */
import { JetType } from '../../domain/JetType';
import { AccelerationRate } from '../../domain/vo/AccelerationRate';
import { CruiseSpeed } from '../../domain/vo/CruiseSpeed';
import { Damage } from '../../domain/vo/Damage';
import { Defense } from '../../domain/vo/Defense';
import { Speed } from '../../domain/vo/Speed';
import { JetTypeEntity } from './JetTypeEntity';

export class JetTypeMapper {
  static toDomain(entity: JetTypeEntity): JetType {
    return JetType.rehydrate({
      id: entity.id,
      name: entity.name,
      maxSpeed: Speed.create(entity.maxSpeed),
      cruiseSpeed: CruiseSpeed.create(entity.cruiseSpeed),
      accelerationRate: AccelerationRate.create(entity.accelerationRate),
      defense: Defense.create(entity.defense),
      damage: Damage.create(entity.damage),
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
    return entity;
  }
}
