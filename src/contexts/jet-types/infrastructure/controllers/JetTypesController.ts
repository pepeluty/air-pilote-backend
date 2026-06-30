/**
 * JetTypesController — HTTP adapter for the jet-types catalog (spec: "Jet Type
 * Catalog").
 *
 * Routes (ALL PUBLIC — `@Public()` skips the global AuthGuard, spec: "no
 * authentication is required"):
 *   GET /jet-types -> ListJetTypes -> 200 [{ id, name, maxSpeed, cruiseSpeed,
 *                                            accelerationRate, defense, damage }]
 *
 * The catalog is a global read (not scoped to a caller), so there is no
 * userId resolution and no `req.user` access — unlike the protected
 * game-records controller. The response exposes every property required by
 * the spec scenario "Each type exposes all required properties".
 *
 * Design data flow (a): GET /jet-types (@Public) -> ListJetTypes -> findAll()
 * -> JetType[] -> serialize to response DTO.
 *
 * Infrastructure layer: framework allowed (NestJS).
 */
import { Controller, Get } from '@nestjs/common';
import { Public } from '@shared/AuthGuard';
import { ListJetTypes } from '../../application/usecases/ListJetTypes';

interface JetTypeDto {
  id: string;
  name: string;
  maxSpeed: number;
  cruiseSpeed: number;
  accelerationRate: number;
  defense: number;
  damage: number;
  rotationSpeed: number;
}

@Public()
@Controller('jet-types')
export class JetTypesController {
  constructor(private readonly listJetTypes: ListJetTypes) {}

  @Get()
  async list(): Promise<JetTypeDto[]> {
    const jetTypes = await this.listJetTypes.execute();
    return jetTypes.map((j) => ({
      id: j.id,
      name: j.name,
      maxSpeed: j.maxSpeed.value,
      cruiseSpeed: j.cruiseSpeed.value,
      accelerationRate: j.accelerationRate.value,
      defense: j.defense.value,
      damage: j.damage.value,
      rotationSpeed: j.rotationSpeed.value,
    }));
  }
}
