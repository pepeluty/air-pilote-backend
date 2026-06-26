/**
 * Base UseCase — abstract execute contract shared across bounded contexts.
 *
 * A use case encapsulates a single application behavior (RegisterUser,
 * LoginUser, PersistGameRecord, ...). The Input/Output types are supplied by
 * the concrete specialization. Application layer: framework-agnostic; depends
 * only on ports + domain.
 */
export abstract class UseCase<TInput, TOutput> {
  abstract execute(input: TInput): Promise<TOutput>;
}