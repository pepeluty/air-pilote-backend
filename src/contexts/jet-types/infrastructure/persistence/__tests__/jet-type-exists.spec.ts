/**
 * JetTypeRepositoryAdapter — unit tests for the `JetTypeExists` query port
 * (task 7.1) AND the `JetTypeRepository` read surface. Tests the REAL adapter
 * with a stubbed MikroORM `EntityManager` (no NestJS, no real DB) following
 * the in-memory-fakes pattern of `registration-login.spec.ts`.
 *
 * The adapter implements both {@link JetTypeRepository} and
 * {@link JetTypeExists} (design Decision #2). These unit tests exercise the
 * adapter's query logic against a fake entity store so we can assert:
 *   - `exists(knownId)` → true, `exists(unknownId)` → false
 *   - `findAll` → maps entities to domain aggregates with the seed values
 *   - `findById(knownId)` → the aggregate, `findById(unknownId)` → null
 *
 * Integration-level wiring against Postgres is covered separately by
 * `jet-types.integration.spec.ts` (task 7.3, testcontainers).
 */
import { JetTypeRepositoryAdapter } from '../JetTypeRepositoryAdapter';
import { JetTypeEntity } from '../JetTypeEntity';

// Minimal EntityManager stub: only the methods the adapter calls
// (`find`, `findOne`, `count`). Each returns from an in-memory entity map.
type MinEm = {
  find: (entity: unknown, where: unknown) => Promise<JetTypeEntity[]>;
  findOne: (entity: unknown, where: { id: string }) => Promise<JetTypeEntity | null>;
  count: (entity: unknown, where: { id: string }) => Promise<number>;
};

/** Build a stub EntityManager backed by an array of JetTypeEntity rows. */
function makeEm(rows: JetTypeEntity[]): MinEm {
  return {
    async find(): Promise<JetTypeEntity[]> {
      return rows;
    },
    async findOne(_e, { id }): Promise<JetTypeEntity | null> {
      return rows.find((r) => r.id === id) ?? null;
    },
    async count(_e, { id }): Promise<number> {
      return rows.filter((r) => r.id === id).length;
    },
  };
}

/** Build a JetTypeEntity row with the seed Interceptor/Balanced/Heavy values. */
function row(
  id: string,
  name: string,
  maxSpeed: number,
  cruiseSpeed: number,
  acc: number,
  defense: number,
  damage: number,
): JetTypeEntity {
  const e = new JetTypeEntity();
  e.id = id;
  e.name = name;
  e.maxSpeed = maxSpeed;
  e.cruiseSpeed = cruiseSpeed;
  e.accelerationRate = acc;
  e.defense = defense;
  e.damage = damage;
  return e;
}

const INTERCEPTOR_ID = '00000000-0000-4000-8000-000000000001';
const BALANCED_ID = '00000000-0000-4000-8000-000000000002';
const HEAVY_ID = '00000000-0000-4000-8000-000000000003';
const UNKNOWN_ID = 'ffffffff-ffff-4000-8000-ffffffffffff';

function seedRows(): JetTypeEntity[] {
  return [
    row(INTERCEPTOR_ID, 'Interceptor', 460, 200, 4.0, 10, 30),
    row(BALANCED_ID, 'Balanced', 360, 200, 5.0, 35, 45),
    row(HEAVY_ID, 'Heavy', 280, 180, 6.0, 60, 80),
  ];
}

describe('JetTypeRepositoryAdapter — JetTypeExists query port (FK validation)', () => {
  it('exists(knownId) → true for each seeded jet type', async () => {
    const adapter = new JetTypeRepositoryAdapter(makeEm(seedRows()) as never);

    expect(await adapter.exists(INTERCEPTOR_ID)).toBe(true);
    expect(await adapter.exists(BALANCED_ID)).toBe(true);
    expect(await adapter.exists(HEAVY_ID)).toBe(true);
  });

  it('exists(unknownId) → false for a non-seeded id', async () => {
    const adapter = new JetTypeRepositoryAdapter(makeEm(seedRows()) as never);

    expect(await adapter.exists(UNKNOWN_ID)).toBe(false);
  });

  it('exists on an empty catalog returns false for any id', async () => {
    const adapter = new JetTypeRepositoryAdapter(makeEm([]) as never);
    expect(await adapter.exists(INTERCEPTOR_ID)).toBe(false);
  });
});

describe('JetTypeRepositoryAdapter — JetTypeRepository read surface', () => {
  it('findAll maps every entity to a domain aggregate with the seed stats', async () => {
    const adapter = new JetTypeRepositoryAdapter(makeEm(seedRows()) as never);

    const jetTypes = await adapter.findAll();
    expect(jetTypes).toHaveLength(3);

    const byName = new Map(jetTypes.map((j) => [j.name, j]));
    expect(byName.get('Interceptor')!.maxSpeed.value).toBe(460);
    expect(byName.get('Interceptor')!.damage.value).toBe(30);
    expect(byName.get('Balanced')!.defense.value).toBe(35);
    expect(byName.get('Heavy')!.accelerationRate.value).toBe(6.0);
  });

  it('findById(knownId) returns the matching aggregate', async () => {
    const adapter = new JetTypeRepositoryAdapter(makeEm(seedRows()) as never);

    const balanced = await adapter.findById(BALANCED_ID);
    expect(balanced).not.toBeNull();
    expect(balanced!.id).toBe(BALANCED_ID);
    expect(balanced!.maxSpeed.value).toBe(360);
  });

  it('findById(unknownId) returns null', async () => {
    const adapter = new JetTypeRepositoryAdapter(makeEm(seedRows()) as never);

    expect(await adapter.findById(UNKNOWN_ID)).toBeNull();
  });
});