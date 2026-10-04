import type { DecorateFn, IContainer, InjectionToken } from 'ts-ioc-container';

import type { IIdGenerator } from './ids';
import type { AnyRepository } from './IRepository';

/**
 * One step of preparing a new record, woven into a repository by `preparing`:
 * given the scope the repository is resolved in, the function a value goes
 * through on its way to becoming a record — an id set, a tenant stamped, a
 * timestamp added.
 *
 * @example
 * const withCreatedAt: Advice<object, { createdAt: Date }> = (scope) => (value) => ({
 *   ...value,
 *   createdAt: IClockToken.resolve(scope).now(),
 * });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Advice<In = any, Out = any> = (scope: IContainer) => (value: In) => Out | Promise<Out>;

/**
 * The advice that sets `id` to the next id of the generator registered under
 * `ids`, resolved from the repository's scope.
 *
 * @example
 * decorate(preparing(withId(IOrderIdsToken)))
 */
export const withId =
  <Id>(ids: InjectionToken<IIdGenerator<Id>>): Advice<object, { id: Id }> =>
  (scope) =>
  async (value) => ({ ...value, id: await ids.resolve(scope).next() });

/**
 * Weaves `advices` into a repository as its `prepare`, which `EntityManager.add`
 * calls to turn a value into a new record. Apply it with the container's
 * `decorate` where the repository is registered: the repository class stays
 * plain persistence code, and each advice resolves what it needs from the scope
 * the repository is resolved in — so an application-scoped repository gets
 * application-scoped generators. The advices run in order, after the
 * repository's own `prepare` when it has one.
 *
 * The repository is answered as itself — its class, methods and fields — with
 * `prepare` added; nothing is copied.
 *
 * @example
 * @register(
 *   IOrderRepositoryToken,
 *   scope((s) => s.hasTag('application')),
 *   decorate(preparing(withId(IOrderIdsToken), withCreatedAt)),
 *   singleton(),
 * )
 * class OrderRepository implements IRepository<OrderDto, Order, Omit<OrderDto, 'id' | 'createdAt'>> { ... }
 *
 * const order = await orders.add({ status: 'open', lines: [] }); // has its id now
 */
export const preparing =
  <TRepository extends AnyRepository>(...advices: Advice[]): DecorateFn<TRepository> =>
  (repository, scope) => {
    const own = repository.prepare?.bind(repository) as ((value: unknown) => Promise<unknown>) | undefined;
    const steps = advices.map((advice) => advice(scope));
    const prepare = async (value: unknown): Promise<unknown> => {
      let prepared = own === undefined ? value : await own(value);
      for (const step of steps) prepared = await step(prepared);
      return prepared;
    };
    return new Proxy(repository, {
      get: (target, key) => {
        if (key === 'prepare') return prepare;
        // Methods run on the repository itself, so its #private fields keep working.
        const member = Reflect.get(target, key, target);
        return typeof member === 'function' ? member.bind(target) : member;
      },
    });
  };
