/**
 * Jet-type value objects + JetType aggregate — unit tests (task 7.1; spec
 * backend-jet-types: "Jet Type Properties Validation").
 *
 * Domain-layer spec: imports only domain VOs + @shared/errors (layer-guard
 * clean — no @nestjs / @mikro-orm / infrastructure / application imports
 * here). Follows the pattern of the game-records `score-game-record.spec.ts`.
 *
 * Asserts every per-VO invariant AND the cross-VO aggregate invariant
 * `maxSpeed > cruiseSpeed > 0` (the spec's headline validation rule). Each VO
 * factory throws {@link ValidationError} on a bad input; the aggregate factory
 * throws on a maxSpeed <= cruiseSpeed.
 */
import { ValidationError } from '@shared/errors';
import { JetType } from '../JetType';
import { AccelerationRate } from '../vo/AccelerationRate';
import { CruiseSpeed } from '../vo/CruiseSpeed';
import { Damage } from '../vo/Damage';
import { Defense } from '../vo/Defense';
import { LockDelay } from '../vo/LockDelay';
import { MissileDamage } from '../vo/MissileDamage';
import { MissileLifetime } from '../vo/MissileLifetime';
import { MissileSpeed } from '../vo/MissileSpeed';
import { MissileTurnRate } from '../vo/MissileTurnRate';
import { RadarAngle } from '../vo/RadarAngle';
import { RadarRange } from '../vo/RadarRange';
import { RotationSpeed } from '../vo/RotationSpeed';
import { Speed } from '../vo/Speed';

describe('Speed value object (maxSpeed > 0)', () => {
  it('accepts a positive value', () => {
    expect(Speed.create(460).value).toBe(460);
  });
  it('rejects zero', () => {
    expect(() => Speed.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => Speed.create(-1)).toThrow(ValidationError);
  });
  it('rejects a non-finite value', () => {
    expect(() => Speed.create(Number.NaN)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(Speed.create(460).equals(Speed.create(460))).toBe(true);
    expect(Speed.create(460).equals(Speed.create(360))).toBe(false);
  });
});

describe('CruiseSpeed value object (> 0)', () => {
  it('accepts a positive value', () => {
    expect(CruiseSpeed.create(200).value).toBe(200);
  });
  it('rejects zero', () => {
    expect(() => CruiseSpeed.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => CruiseSpeed.create(-1)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(CruiseSpeed.create(200).equals(CruiseSpeed.create(200))).toBe(true);
  });
});

describe('AccelerationRate value object (> 0, stored PER SECOND)', () => {
  it('accepts a positive per-second k (e.g. 4.0)', () => {
    expect(AccelerationRate.create(4.0).value).toBe(4.0);
  });
  it('rejects zero', () => {
    expect(() => AccelerationRate.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => AccelerationRate.create(-0.1)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(AccelerationRate.create(4.0).equals(AccelerationRate.create(4.0))).toBe(true);
  });
});

describe('Defense value object (closed range [0, 100])', () => {
  it('accepts 0 (lower bound)', () => {
    expect(Defense.create(0).value).toBe(0);
  });
  it('accepts 50 (mid range)', () => {
    expect(Defense.create(50).value).toBe(50);
  });
  it('accepts 100 (upper bound)', () => {
    expect(Defense.create(100).value).toBe(100);
  });
  it('rejects -1 (below lower bound)', () => {
    expect(() => Defense.create(-1)).toThrow(ValidationError);
  });
  it('rejects 101 (above upper bound)', () => {
    expect(() => Defense.create(101)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(Defense.create(35).equals(Defense.create(35))).toBe(true);
  });
});

describe('Damage value object (> 0, per-hit projectile damage)', () => {
  it('accepts a positive value (e.g. Interceptor 30)', () => {
    expect(Damage.create(30).value).toBe(30);
  });
  it('rejects zero', () => {
    expect(() => Damage.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => Damage.create(-1)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(Damage.create(45).equals(Damage.create(45))).toBe(true);
  });
});

describe('RotationSpeed value object (> 0 rad/s)', () => {
  it('accepts a positive value (e.g. Interceptor 6.0)', () => {
    expect(RotationSpeed.create(6.0).value).toBe(6.0);
  });
  it('accepts a fractional value (e.g. Balanced 4.5)', () => {
    expect(RotationSpeed.create(4.5).value).toBe(4.5);
  });
  it('rejects zero', () => {
    expect(() => RotationSpeed.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => RotationSpeed.create(-1)).toThrow(ValidationError);
  });
  it('rejects a non-finite value', () => {
    expect(() => RotationSpeed.create(Number.NaN)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(RotationSpeed.create(6.0).equals(RotationSpeed.create(6.0))).toBe(true);
    expect(RotationSpeed.create(6.0).equals(RotationSpeed.create(4.5))).toBe(false);
  });
});

describe('LockDelay value object (> 0 ms)', () => {
  it('accepts a positive value (e.g. Interceptor 400)', () => {
    expect(LockDelay.create(400).value).toBe(400);
  });
  it('rejects zero', () => {
    expect(() => LockDelay.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => LockDelay.create(-1)).toThrow(ValidationError);
  });
  it('rejects a non-finite value', () => {
    expect(() => LockDelay.create(Number.NaN)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(LockDelay.create(400).equals(LockDelay.create(400))).toBe(true);
    expect(LockDelay.create(400).equals(LockDelay.create(600))).toBe(false);
  });
});

describe('RadarRange value object (> 0 px)', () => {
  it('accepts a positive value (e.g. Interceptor 550)', () => {
    expect(RadarRange.create(550).value).toBe(550);
  });
  it('rejects zero', () => {
    expect(() => RadarRange.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => RadarRange.create(-1)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(RadarRange.create(550).equals(RadarRange.create(550))).toBe(true);
  });
});

describe('RadarAngle value object ((0, 90) degrees)', () => {
  it('accepts a value in range (e.g. Interceptor 25)', () => {
    expect(RadarAngle.create(25).value).toBe(25);
  });
  it('rejects zero', () => {
    expect(() => RadarAngle.create(0)).toThrow(ValidationError);
  });
  it('rejects 90 (exclusive upper bound)', () => {
    expect(() => RadarAngle.create(90)).toThrow(ValidationError);
  });
  it('rejects a value above 90', () => {
    expect(() => RadarAngle.create(91)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => RadarAngle.create(-1)).toThrow(ValidationError);
  });
  it('rejects a non-finite value', () => {
    expect(() => RadarAngle.create(Number.NaN)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(RadarAngle.create(25).equals(RadarAngle.create(25))).toBe(true);
    expect(RadarAngle.create(25).equals(RadarAngle.create(30))).toBe(false);
  });
});

describe('MissileSpeed value object (> 0 px/s)', () => {
  it('accepts a positive value (e.g. Interceptor 380)', () => {
    expect(MissileSpeed.create(380).value).toBe(380);
  });
  it('rejects zero', () => {
    expect(() => MissileSpeed.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => MissileSpeed.create(-1)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(MissileSpeed.create(380).equals(MissileSpeed.create(380))).toBe(true);
  });
});

describe('MissileTurnRate value object (> 0 rad/s)', () => {
  it('accepts a positive value (e.g. Interceptor 5.0)', () => {
    expect(MissileTurnRate.create(5.0).value).toBe(5.0);
  });
  it('rejects zero', () => {
    expect(() => MissileTurnRate.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => MissileTurnRate.create(-1)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(MissileTurnRate.create(5.0).equals(MissileTurnRate.create(5.0))).toBe(true);
  });
});

describe('MissileLifetime value object (> 0 ms)', () => {
  it('accepts a positive value (e.g. Interceptor 2500)', () => {
    expect(MissileLifetime.create(2500).value).toBe(2500);
  });
  it('rejects zero', () => {
    expect(() => MissileLifetime.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => MissileLifetime.create(-1)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(MissileLifetime.create(2500).equals(MissileLifetime.create(2500))).toBe(true);
  });
});

describe('MissileDamage value object (> 0 hp)', () => {
  it('accepts a positive value (e.g. Interceptor 60)', () => {
    expect(MissileDamage.create(60).value).toBe(60);
  });
  it('rejects zero', () => {
    expect(() => MissileDamage.create(0)).toThrow(ValidationError);
  });
  it('rejects a negative value', () => {
    expect(() => MissileDamage.create(-1)).toThrow(ValidationError);
  });
  it('is value-based equal', () => {
    expect(MissileDamage.create(60).equals(MissileDamage.create(60))).toBe(true);
  });
});

describe('JetType aggregate (cross-VO invariant maxSpeed > cruiseSpeed)', () => {
  // Seed values from the authoritative design seed-values table.
  const INTERCEPTOR_ID = '00000000-0000-4000-8000-000000000001';
  const BALANCED_ID = '00000000-0000-4000-8000-000000000002';
  const HEAVY_ID = '00000000-0000-4000-8000-000000000003';

  it('creates the Interceptor archetype with all stats exposed', () => {
    const jet = JetType.create(
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
    );

    expect(jet.id).toBe(INTERCEPTOR_ID);
    expect(jet.name).toBe('Interceptor');
    expect(jet.maxSpeed.value).toBe(460);
    expect(jet.cruiseSpeed.value).toBe(200);
    expect(jet.accelerationRate.value).toBe(4.0);
    expect(jet.defense.value).toBe(10);
    expect(jet.damage.value).toBe(30);
    expect(jet.rotationSpeed.value).toBe(6.0);
    expect(jet.lockDelay.value).toBe(400);
    expect(jet.radarRange.value).toBe(550);
    expect(jet.radarAngle.value).toBe(25);
    expect(jet.missileSpeed.value).toBe(380);
    expect(jet.missileTurnRate.value).toBe(5.0);
    expect(jet.missileLifetime.value).toBe(2500);
    expect(jet.missileDamage.value).toBe(60);
  });

  it('creates the Balanced archetype (the FK default)', () => {
    const jet = JetType.create(
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
    );
    expect(jet.name).toBe('Balanced');
    expect(jet.maxSpeed.value).toBe(360);
    expect(jet.defense.value).toBe(35);
    expect(jet.rotationSpeed.value).toBe(4.5);
    expect(jet.lockDelay.value).toBe(600);
    expect(jet.radarRange.value).toBe(500);
    expect(jet.radarAngle.value).toBe(30);
    expect(jet.missileSpeed.value).toBe(350);
    expect(jet.missileTurnRate.value).toBe(4.0);
    expect(jet.missileLifetime.value).toBe(3000);
    expect(jet.missileDamage.value).toBe(75);
  });

  it('creates the Heavy archetype (slowest, toughest)', () => {
    const jet = JetType.create(
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
    );
    expect(jet.name).toBe('Heavy');
    expect(jet.damage.value).toBe(80);
    expect(jet.rotationSpeed.value).toBe(3.0);
    expect(jet.lockDelay.value).toBe(1000);
    expect(jet.radarRange.value).toBe(450);
    expect(jet.radarAngle.value).toBe(35);
    expect(jet.missileSpeed.value).toBe(300);
    expect(jet.missileTurnRate.value).toBe(3.0);
    expect(jet.missileLifetime.value).toBe(3500);
    expect(jet.missileDamage.value).toBe(90);
  });

  it('rejects maxSpeed <= cruiseSpeed (the headline invariant)', () => {
    // maxSpeed (200) == cruiseSpeed (200) → rejected.
    expect(() =>
      JetType.create(
        INTERCEPTOR_ID,
        'Bogus',
        Speed.create(200),
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
    ).toThrow(ValidationError);

    // maxSpeed (200) < cruiseSpeed (460) → rejected.
    expect(() =>
      JetType.create(
        INTERCEPTOR_ID,
        'Bogus',
        Speed.create(200),
        CruiseSpeed.create(460),
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
    ).toThrow(ValidationError);
  });

  it('rejects an empty id (fixed seed UUIDs are required)', () => {
    expect(() =>
      JetType.create(
        '',
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
    ).toThrow(ValidationError);
  });

  it('rejects an empty name', () => {
    expect(() =>
      JetType.create(
        INTERCEPTOR_ID,
        '',
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
    ).toThrow(ValidationError);
  });

  it('rehydrate round-trips the aggregate without re-validating invariants', () => {
    const jet = JetType.rehydrate({
      id: INTERCEPTOR_ID,
      name: 'Interceptor',
      maxSpeed: Speed.create(460),
      cruiseSpeed: CruiseSpeed.create(200),
      accelerationRate: AccelerationRate.create(4.0),
      defense: Defense.create(10),
      damage: Damage.create(30),
      rotationSpeed: RotationSpeed.create(6.0),
      lockDelay: LockDelay.create(400),
      radarRange: RadarRange.create(550),
      radarAngle: RadarAngle.create(25),
      missileSpeed: MissileSpeed.create(380),
      missileTurnRate: MissileTurnRate.create(5.0),
      missileLifetime: MissileLifetime.create(2500),
      missileDamage: MissileDamage.create(60),
    });
    expect(jet.id).toBe(INTERCEPTOR_ID);
    expect(jet.maxSpeed.value).toBe(460);
    expect(jet.rotationSpeed.value).toBe(6.0);
    expect(jet.lockDelay.value).toBe(400);
    expect(jet.radarAngle.value).toBe(25);
    expect(jet.missileDamage.value).toBe(60);
  });
});