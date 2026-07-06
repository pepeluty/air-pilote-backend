/**
 * ListJetTypes — return the full catalog of seeded jet types (spec: "Jet Type
 * Catalog"). Backs the public `GET /jet-types` endpoint.
 *
 * Flow (design data flow a): GET /jet-types (@Public) -> ListJetTypes ->
 * repository.findAll() -> JetType[] -> controller serializes to the response
 * DTO `{ id, name, maxSpeed, cruiseSpeed, accelerationRate, defense, damage }`.
 *
 * No input: the catalog is a global read, not scoped to a caller. The catalog
 * is seed-only in this change (no CRUD, design Decision #2), so this use case
 * has no mutation path.
 *
 * Application layer: framework-agnostic — depends only on ports + domain.
 */
import { UseCase } from '@shared/application/UseCase';
import { JetType } from '../../domain/JetType';
import { JetTypeRepository } from '../ports/JetTypeRepository.port';

export class ListJetTypes extends UseCase<void, JetType[]> {
  constructor(private readonly repository: JetTypeRepository) {
    super();
  }

  async execute(_input: void): Promise<JetType[]> {
    return this.repository.findAll();
  }
}
