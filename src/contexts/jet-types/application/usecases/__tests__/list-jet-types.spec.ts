/**
 * ListJetTypes — unit tests (task 7.1; spec backend-jet-types: "Jet Type
 * Catalog"). Tests BEHAVIOR via the application port only — no NestJS, no
 * MikroORM. A fake {@link JetTypeRepository} returns the 3 hardcoded seed
 * JetType aggregates so assertions verify the use case returns the catalog
 * with the correct names + stats matching the seed migration values.
 *
 * Follows the in-memory-fakes pattern of `registration-login.spec.ts`
 * (no jest.mock — explicit port implementations that record interactions).
 */
import { ListJetTypes } from '../ListJetTypes';
import { JetType } from '../../../domain/JetType';
import { AccelerationRate } from '../../../domain/vo/AccelerationRate';
import { CruiseSpeed } from '../../../domain/vo/CruiseSpeed';
import { Damage } from '../../../domain/vo/Damage';
import { Defense } from '../../../domain/vo/Defense';
import { LockDelay } from '../../../domain/vo/LockDelay';
import { MissileDamage } from '../../../domain/vo/MissileDamage';
import { MissileLifetime } from '../../../domain/vo/MissileLifetime';
import { MissileSpeed } from '../../../domain/vo/MissileSpeed';
import { MissileTurnRate } from '../../../domain/vo/MissileTurnRate';
import { RadarAngle } from '../../../domain/vo/RadarAngle';
import { RadarRange } from '../../../domain/vo/RadarRange';
import { RotationSpeed } from '../../../domain/vo/RotationSpeed';
import { Speed } from '../../../domain/vo/Speed';
import type { JetTypeRepository } from '../../ports/JetTypeRepository.port';

/** Fixed seed UUIDs (design "Fixed seed UUIDs"). */
const INTERCEPTOR_ID = '00000000-0000-4000-8000-000000000001';
const BALANCED_ID = '00000000-0000-4000-8000-000000000002';
const HEAVY_ID = '00000000-0000-4000-8000-000000000003';

/** Build the 3 seed JetType aggregates (mirror of Migration20260626000002). */
function seedJetTypes(): JetType[] {
  return [
    JetType.create(
      INTERCEPTOR_ID,
      'Interceptor',
      Speed.create(460),
      CruiseSpeed.create(200),
      AccelerationRate.create(4.0),
      Defense.create(10),
      Damage.create(30),
      RotationSpeed.create(6.0),
      LockDelay.create(400),
      RadarRange.create(550),
      RadarAngle.create(25),
      MissileSpeed.create(380),
      MissileTurnRate.create(5.0),
      MissileLifetime.create(2500),
      MissileDamage.create(60),
    ),
    JetType.create(
      BALANCED_ID,
      'Balanced',
      Speed.create(360),
      CruiseSpeed.create(200),
      AccelerationRate.create(5.0),
      Defense.create(35),
      Damage.create(45),
      RotationSpeed.create(4.5),
      LockDelay.create(600),
      RadarRange.create(500),
      RadarAngle.create(30),
      MissileSpeed.create(350),
      MissileTurnRate.create(4.0),
      MissileLifetime.create(3000),
      MissileDamage.create(75),
    ),
    JetType.create(
      HEAVY_ID,
      'Heavy',
      Speed.create(280),
      CruiseSpeed.create(180),
      AccelerationRate.create(6.0),
      Defense.create(60),
      Damage.create(80),
      RotationSpeed.create(3.0),
      LockDelay.create(1000),
      RadarRange.create(450),
      RadarAngle.create(35),
      MissileSpeed.create(300),
      MissileTurnRate.create(3.0),
      MissileLifetime.create(3500),
      MissileDamage.create(90),
    ),
  ];
}

/** In-memory fake JetTypeRepository — returns the seeded catalog. */
class FakeJetTypeRepository implements JetTypeRepository {
  constructor(private readonly catalog: JetType[] = seedJetTypes()) {}
  findAllCalls = 0;
  async findAll(): Promise<JetType[]> {
    this.findAllCalls += 1;
    return this.catalog;
  }
  async findById(id: string): Promise<JetType | null> {
    return this.catalog.find((j) => j.id === id) ?? null;
  }
}

describe('ListJetTypes use case', () => {
  it('returns all 3 seeded jet types (spec: Jet Type Catalog)', async () => {
    const repo = new FakeJetTypeRepository();
    const usecase = new ListJetTypes(repo);

    const result = await usecase.execute(undefined);

    expect(result).toHaveLength(3);
    expect(repo.findAllCalls).toBe(1);
  });

  it('each jet type carries the correct name + seed stats', async () => {
    const repo = new FakeJetTypeRepository();
    const usecase = new ListJetTypes(repo);

    const result = await usecase.execute(undefined);
    const byName = new Map(result.map((j) => [j.name, j]));

    const interceptor = byName.get('Interceptor');
    expect(interceptor).toBeDefined();
    expect(interceptor!.id).toBe(INTERCEPTOR_ID);
    expect(interceptor!.maxSpeed.value).toBe(460);
    expect(interceptor!.cruiseSpeed.value).toBe(200);
    expect(interceptor!.accelerationRate.value).toBe(4.0);
    expect(interceptor!.defense.value).toBe(10);
    expect(interceptor!.damage.value).toBe(30);
    expect(interceptor!.rotationSpeed.value).toBe(6.0);
    expect(interceptor!.lockDelay.value).toBe(400);
    expect(interceptor!.radarRange.value).toBe(550);
    expect(interceptor!.radarAngle.value).toBe(25);
    expect(interceptor!.missileSpeed.value).toBe(380);
    expect(interceptor!.missileTurnRate.value).toBe(5.0);
    expect(interceptor!.missileLifetime.value).toBe(2500);
    expect(interceptor!.missileDamage.value).toBe(60);

    const balanced = byName.get('Balanced');
    expect(balanced).toBeDefined();
    expect(balanced!.id).toBe(BALANCED_ID);
    expect(balanced!.maxSpeed.value).toBe(360);
    expect(balanced!.accelerationRate.value).toBe(5.0);
    expect(balanced!.defense.value).toBe(35);
    expect(balanced!.damage.value).toBe(45);
    expect(balanced!.rotationSpeed.value).toBe(4.5);
    expect(balanced!.lockDelay.value).toBe(600);
    expect(balanced!.radarRange.value).toBe(500);
    expect(balanced!.radarAngle.value).toBe(30);
    expect(balanced!.missileSpeed.value).toBe(350);
    expect(balanced!.missileTurnRate.value).toBe(4.0);
    expect(balanced!.missileLifetime.value).toBe(3000);
    expect(balanced!.missileDamage.value).toBe(75);

    const heavy = byName.get('Heavy');
    expect(heavy).toBeDefined();
    expect(heavy!.id).toBe(HEAVY_ID);
    expect(heavy!.maxSpeed.value).toBe(280);
    expect(heavy!.cruiseSpeed.value).toBe(180);
    expect(heavy!.accelerationRate.value).toBe(6.0);
    expect(heavy!.defense.value).toBe(60);
    expect(heavy!.damage.value).toBe(80);
    expect(heavy!.rotationSpeed.value).toBe(3.0);
    expect(heavy!.lockDelay.value).toBe(1000);
    expect(heavy!.radarRange.value).toBe(450);
    expect(heavy!.radarAngle.value).toBe(35);
    expect(heavy!.missileSpeed.value).toBe(300);
    expect(heavy!.missileTurnRate.value).toBe(3.0);
    expect(heavy!.missileLifetime.value).toBe(3500);
    expect(heavy!.missileDamage.value).toBe(90);
  });

  it('returns an empty catalog when the repository has no rows (degenerate)', async () => {
    const repo = new FakeJetTypeRepository([]);
    const usecase = new ListJetTypes(repo);

    const result = await usecase.execute(undefined);

    expect(result).toHaveLength(0);
  });
});