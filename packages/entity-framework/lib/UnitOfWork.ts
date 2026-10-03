import {
  type IContainer,
  inject,
  type InjectionToken,
  type InjectOptions,
  type ITypedEvent,
  register,
  SingleToken,
  singleton,
  TypedEvent,
} from 'ts-ioc-container';

import { type Change, orderChanges, type Reference } from './changes';
import { checkIdentities, EntityManager, trackedAt, writeChange } from './EntityManager';
import { Flush } from './Flush';
import type { AnyRepository, RequireKeyOf } from './IRepository';

/** The token a `UnitOfWork` is registered and resolved by. */
export const IUnitOfWorkToken = new SingleToken<UnitOfWork>('IUnitOfWork');

/**
 * The unit of work: one `EntityManager` per repository, and the commit that
 * writes all of their changes together — in one go, ordered by the
 * repositories' `references`, and all or nothing in memory.
 *
 * Register it in the scope a unit of work lives in — one per request, say. It is
 * built with that scope, and resolves repositories from it.
 *
 * @example
 * const app = new Container({ tags: ['application'] })
 *   .addRegistration(R.fromClass(OrderRepository))
 *   .addRegistration(R.fromClass(UnitOfWork).when((s) => s.hasTag('request')));
 *
 * const request = app.createScope({ tags: ['request'] });
 * const uow = IUnitOfWorkToken.resolve(request);
 * const order = await uow.of(IOrderRepositoryToken).findByIdOrFail('o-1');
 * order.state.status = 'cancelled';
 * await db.transaction(() => uow.commit());
 */
@register(IUnitOfWorkToken, singleton())
export class UnitOfWork {
  private readonly managers = new Map<AnyRepository, EntityManager>();
  private readonly onCommitted = new TypedEvent<[readonly Change[]]>();

  /**
   * Emitted after a commit, with the changes it wrote, in the order it wrote
   * them — the place to dispatch domain events or write an audit log. Nothing
   * is emitted for a commit that failed.
   */
  readonly committed: ITypedEvent<[readonly Change[]]> = this.onCommitted;

  constructor(@inject(({ scope }) => scope) private readonly scope: IContainer) {}

  /**
   * The entity manager over the repository behind `repositoryToken`, resolved
   * from this unit of work's scope: one per repository, created on first use.
   *
   * @example
   * const orders = uow.of(IOrderRepositoryToken);
   */
  of<TRepository extends AnyRepository>(
    repositoryToken: InjectionToken<TRepository> & RequireKeyOf<TRepository>,
  ): EntityManager<TRepository> {
    const repository = repositoryToken.resolve(this.scope);
    let manager = this.managers.get(repository);
    if (manager === undefined) {
      manager = new EntityManager(repository as AnyRepository);
      this.managers.set(repository, manager);
    }
    return manager as unknown as EntityManager<TRepository>;
  }

  /** Whether a commit would write anything. */
  hasChanges(): boolean {
    return [...this.managers.values()].some((manager) => manager.hasChanges());
  }

  /**
   * What `commit` would write, in the order it would write it: creates and
   * updates first, each after the new records it references, then deletes,
   * each before the deleted records it references. Nothing is written.
   *
   * @throws {EntityReferenceError} when new records, or deleted ones, reference each other in a cycle.
   */
  getChanges(): Change[] {
    const changes = [...this.managers.values()]
      .flatMap((manager) =>
        (manager.getChanges() as Change[]).map((change) => [manager[trackedAt](change.entity), change] as const),
      )
      .sort(([a], [b]) => a - b)
      .map(([, change]) => change);
    return orderChanges(changes, (repository) => this.referencesOf(repository));
  }

  /**
   * Writes every change of the unit of work, in `getChanges` order. Only once
   * every write succeeded does what the repositories answered become what is
   * stored; when one throws, nothing changes in memory, so once the transaction
   * rolls back the commit can be run again. Opens no transaction: call it inside
   * one. Answers the changes it wrote, and emits them on `committed`.
   *
   * @example
   * await db.transaction(() => uow.commit());
   *
   * @throws {EntityIdentityError} when an entity's `state.id`, or the rest of its key, was reassigned.
   * @throws {EntityReferenceError} when new records, or deleted ones, reference each other in a cycle.
   */
  async commit(): Promise<readonly Change[]> {
    for (const manager of this.managers.values()) manager[checkIdentities]();
    const changes = this.getChanges();
    const flush = new Flush();
    for (const change of changes) await this.managers.get(change.repository)![writeChange](change, flush);
    flush.commit();
    this.onCommitted.emit(changes);
    return changes;
  }

  private referencesOf(repository: AnyRepository): Reference[] {
    return Object.entries(repository.references ?? {}).map(([field, token]) => ({
      field,
      target: (token as InjectionToken<AnyRepository>).resolve(this.scope),
    }));
  }
}

/**
 * Injects the entity manager over a repository, from the unit of work of the
 * scope being resolved.
 *
 * @example
 * class OrderService {
 *   constructor(@inject(managerOf(IOrderRepositoryToken)) private readonly orders: EntityManager<OrderRepository>) {}
 * }
 */
export const managerOf =
  <TRepository extends AnyRepository>(repositoryToken: InjectionToken<TRepository> & RequireKeyOf<TRepository>) =>
  ({ scope }: InjectOptions): EntityManager<TRepository> =>
    IUnitOfWorkToken.resolve(scope).of(repositoryToken);
