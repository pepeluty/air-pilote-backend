/**
 * UserExists — cross-context query port (design Decision #5, CRITICAL).
 *
 * Implemented by the identity context's infrastructure layer as a read-model
 * (NOT the UserRepository write port) and consumed by the global AuthGuard so
 * that a token for a deleted user is rejected with a clean 401
 * NonExistentUserError instead of leaking a FK 500 into game-records.
 *
 * Shared kernel: framework-agnostic (pure TS). NestJS DI token exported below
 * — adapters bind to {@link USER_EXISTS} in their module providers.
 */

/** NestJS injection token for the UserExists port. */
export const USER_EXISTS = Symbol('USER_EXISTS');

/**
 * Query whether a user exists by id. Resolves `true` if the user is present,
 * `false` otherwise. Implementations MUST be idempotent side-effect-free reads.
 */
export interface UserExists {
  exists(userId: string): Promise<boolean>;
}
