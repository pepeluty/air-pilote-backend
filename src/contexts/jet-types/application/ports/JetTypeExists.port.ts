/**
 * JetTypeExists — cross-context query port (design: mirrors the shared
 * {@link UserExists} pattern from project-bootstrap Decision #5).
 *
 * Implemented by the jet-types context's infrastructure layer (the same
 * adapter that implements {@link JetTypeRepository}) and consumed by the
 * game-records `PersistGameRecord` use case so that an unknown `jetTypeId`
 * is rejected with a clean 422 {@link ValidationError} instead of leaking a
 * FK 500 (design data flow d: "JetTypeExists(jetTypeId)? false ->
 * ValidationError 422 (no FK 500)").
 *
 * Application layer: framework-agnostic — no @nestjs/@mikro-orm. NestJS DI
 * token exported below — the jet-types module binds its adapter to
 * {@link JET_TYPE_EXISTS} and EXPORTS it so game-records can inject it.
 */
import type { Port } from '@shared/application/Port';

/** NestJS injection token for the JetTypeExists port. */
export const JET_TYPE_EXISTS = Symbol('JET_TYPE_EXISTS');

/**
 * Query whether a jet type exists by id. Resolves `true` if the id is a
 * seeded jet type, `false` otherwise. Implementations MUST be idempotent
 * side-effect-free reads.
 */
export interface JetTypeExists extends Port {
  exists(id: string): Promise<boolean>;
}
