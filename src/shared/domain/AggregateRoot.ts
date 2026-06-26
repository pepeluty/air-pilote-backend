import { Entity } from './Entity';

/**
 * Minimal domain event envelope. Handlers are wired by the infrastructure
 * layer (not the aggregate). Kept intentionally small for the MVP shared
 * kernel — bus/dispatcher arrives as needed in later PRs.
 */
export interface DomainEvent {
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly type: string;
}

/**
 * Base AggregateRoot — an Entity that may own a list of pending domain events.
 * Domain layer: framework-agnostic.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  protected readonly _events: DomainEvent[] = [];

  protected constructor(id: TId) {
    super(id);
  }

  get events(): ReadonlyArray<DomainEvent> {
    return this._events;
  }

  protected record(event: DomainEvent): void {
    this._events.push(event);
  }

  clearEvents(): void {
    this._events.length = 0;
  }
}