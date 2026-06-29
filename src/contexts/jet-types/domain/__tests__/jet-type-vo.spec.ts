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
    );

    expect(jet.id).toBe(INTERCEPTOR_ID);
    expect(jet.name).toBe('Interceptor');
    expect(jet.maxSpeed.value).toBe(460);
    expect(jet.cruiseSpeed.value).toBe(200);
    expect(jet.accelerationRate.value).toBe(4.0);
    expect(jet.defense.value).toBe(10);
    expect(jet.damage.value).toBe(30);
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
    );
    expect(jet.name).toBe('Balanced');
    expect(jet.maxSpeed.value).toBe(360);
    expect(jet.defense.value).toBe(35);
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
    );
    expect(jet.name).toBe('Heavy');
    expect(jet.damage.value).toBe(80);
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
    });
    expect(jet.id).toBe(INTERCEPTOR_ID);
    expect(jet.maxSpeed.value).toBe(460);
  });
});