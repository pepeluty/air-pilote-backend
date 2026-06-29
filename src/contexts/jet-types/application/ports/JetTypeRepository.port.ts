/**
 * JetTypeRepository — outbound port for the jet-types read model (jet-types
 * context). Implemented by the MikroORM adapter in the infrastructure layer.
 *
 * This is a READ-ONLY catalog port: the three jet types are seed-only in this
 * change (no create/update/delete is exposed, design Decision #2). The two
 * read shapes support the public `GET /jet-types` catalog (findAll) and the
 * cross-context FK validation in PersistGameRecord (findById, though the
 * boolean {@link JetTypeExists} is the preferred FK-validation surface).
 *
 * Application layer: framework-agnostic — no @nestjs/@mikro-orm. NestJS DI
 * token exported below — adapters bind to {@link JET_TYPE_REPOSITORY} in
 * their module providers.
 */
import type { Port } from '@shared/application/Port';
import type { JetType } from '../../domain/JetType';

/** NestJS injection token for the JetTypeRepository port. */
export const JET_TYPE_REPOSITORY = Symbol('JET_TYPE_REPOSITORY');

export interface JetTypeRepository extends Port {
  /** All seeded jet types. Order is not guaranteed; callers sort if needed. */
  findAll(): Promise<JetType[]>;

  /** A single jet type by id, or null when no such id is seeded. */
  findById(id: string): Promise<JetType | null>;
}
