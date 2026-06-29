/**
 * JetType — jet-types aggregate root.
 *
 * Owns one selectable jet archetype for a session: a stable id, a display
 * name, and the five stat value objects (maxSpeed, cruiseSpeed,
 * accelerationRate, defense, damage). Constructed via the
 * {@link JetType.create} factory so the cross-VO invariant
 * `maxSpeed > cruiseSpeed > 0` is enforced at the edge (spec: "Jet Type
 * Properties Validation"). No ORM/Nest decorators — the persistence model
 * is {@link JetTypeEntity} in the infrastructure layer, mapped to/from this
 * domain entity (design Decision #2 Data Mapper + UoW). Domain layer:
 * framework-agnostic.
 *
 * Seed-only in this change: the three jet types (Interceptor, Balanced,
 * Heavy) are inserted by Migration20260626000002 with FIXED UUIDs (design
 * Decision #2). `create` takes an explicit id (no randomUUID) because the
 * seed IDs are fixed and MUST match the FE fallback constants + the
 * game_records.jet_type_id FK default (design: "FE fallback + migration +
 * FK default MUST match").
 */
import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { ValidationError } from '@shared/errors';
import { AccelerationRate } from './vo/AccelerationRate';
import { CruiseSpeed } from './vo/CruiseSpeed';
import { Damage } from './vo/Damage';
import { Defense } from './vo/Defense';
import { Speed } from './vo/Speed';

export interface JetTypeProps {
  readonly id: string;
  readonly name: string;
  readonly maxSpeed: Speed;
  readonly cruiseSpeed: CruiseSpeed;
  readonly accelerationRate: AccelerationRate;
  readonly defense: Defense;
  readonly damage: Damage;
}

export class JetType extends AggregateRoot<string> {
  public readonly name: string;
  public readonly maxSpeed: Speed;
  public readonly cruiseSpeed: CruiseSpeed;
  public readonly accelerationRate: AccelerationRate;
  public readonly defense: Defense;
  public readonly damage: Damage;

  private constructor(props: JetTypeProps) {
    super(props.id);
    this.name = props.name;
    this.maxSpeed = props.maxSpeed;
    this.cruiseSpeed = props.cruiseSpeed;
    this.accelerationRate = props.accelerationRate;
    this.defense = props.defense;
    this.damage = props.damage;
  }

  /**
   * Factory for a jet type. The five stat value objects enforce their own
   * per-VO invariants (> 0, [0,100]); this factory enforces the cross-VO
   * invariant `maxSpeed > cruiseSpeed` (spec: "maxSpeed > cruiseSpeed > 0").
   * Throws {@link ValidationError} when the invariant is violated. `id` is
   * taken explicitly (fixed seed UUIDs) — never auto-generated.
   */
  static create(
    id: string,
    name: string,
    maxSpeed: Speed,
    cruiseSpeed: CruiseSpeed,
    accelerationRate: AccelerationRate,
    defense: Defense,
    damage: Damage,
  ): JetType {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError('jet_type_id_required');
    }
    if (typeof name !== 'string' || name.length === 0) {
      throw new ValidationError('jet_type_name_required');
    }
    // Cross-VO invariant: maxSpeed MUST exceed cruiseSpeed. The per-VO > 0
    // checks are already enforced by the Speed / CruiseSpeed factories.
    if (maxSpeed.value <= cruiseSpeed.value) {
      throw new ValidationError('jet_type_max_speed_must_exceed_cruise_speed');
    }
    return new JetType({
      id,
      name,
      maxSpeed,
      cruiseSpeed,
      accelerationRate,
      defense,
      damage,
    });
  }

  /** Rehydrate an aggregate from persistence (no invariant re-validation). */
  static rehydrate(props: JetTypeProps): JetType {
    return new JetType(props);
  }
}
