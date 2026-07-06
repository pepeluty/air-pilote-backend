/**
 * UserRepository — outbound port for User aggregate persistence
 * (identity write model). Implemented by the MikroORM adapter in the
 * infrastructure layer; the same adapter also implements the shared
 * {@link UserExists} read-model for the global AuthGuard (design Decision #5).
 *
 * Application layer: framework-agnostic — no @nestjs/@mikro-orm.
 */
import type { Port } from '@shared/application/Port';
import type { User } from '../../domain/User';

export interface UserRepository extends Port {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
}
