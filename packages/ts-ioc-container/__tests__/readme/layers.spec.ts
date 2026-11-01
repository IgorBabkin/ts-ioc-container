import 'reflect-metadata';
import {
  by,
  Container,
  createComposeClassDecorator,
  DependencyNotFoundError,
  GroupAliasToken,
  inject,
  register,
  Registration as R,
  type RegistrationMapper,
  scope,
  singleton,
  SingleToken,
} from '../../lib';

/**
 * Architecture vocabulary: layer and scope decorators
 *
 * Give the architecture names, and a class states where it belongs in one line:
 *
 *   @perRequest()
 *   @service(IOrderServiceToken, singleton())
 *   class OrderService {}
 *
 * - Scope decorators (`perApp`, `perRequest`) wrap `scope(...)`. An optional
 *   name narrows one further to a scope opened with that extra tag:
 *   `perRequest('admin')` exists only in requests tagged `admin`.
 * - Layer decorators (`service`, `repository`) wrap `register(...)` and add the
 *   class to a `GroupAliasToken` of its layer, so the whole layer can be listed
 *   from any scope - to reset repositories between tests, run health checks, or
 *   assert an architecture rule. Its own token and lifetime are passed in as
 *   mappers, so a class never stacks two `@register`s.
 * - `createComposeClassDecorator` names a combination the codebase repeats.
 *
 * The decorators are a vocabulary your team - and your AI coding agent - can
 * apply without knowing the registration rules behind them.
 */

// --- The vocabulary --------------------------------------------------------

const perScope =
  (tag: string) =>
  (name?: string): ClassDecorator =>
    register(scope((s) => s.hasTag(tag) && (name === undefined || s.hasTag(name))));

const perApp = perScope('application');
const perRequest = perScope('request');

interface IResettable {
  reset(): void;
}

const IServiceToken = new GroupAliasToken<object>('IService');
const IRepositoryToken = new GroupAliasToken<IResettable>('IRepository');

const service = (...mappers: RegistrationMapper[]): ClassDecorator => register(IServiceToken, ...mappers);
const repository = (...mappers: RegistrationMapper[]): ClassDecorator => register(IRepositoryToken, ...mappers);

/** One application-wide repository, in one decorator. */
const appRepository = (...mappers: RegistrationMapper[]) =>
  createComposeClassDecorator(perApp(), repository(singleton(), ...mappers));

// --- An application written in it ------------------------------------------

interface Order {
  id: string;
  total: number;
}

const IOrderRepositoryToken = new SingleToken<OrderRepository>('IOrderRepository');
const ICustomerRepositoryToken = new SingleToken<CustomerRepository>('ICustomerRepository');
const IOrderServiceToken = new SingleToken<OrderService>('IOrderService');
const IRefundServiceToken = new SingleToken<RefundService>('IRefundService');

@appRepository(IOrderRepositoryToken)
class OrderRepository implements IResettable {
  orders: Order[] = [{ id: 'o-1', total: 30 }];

  reset(): void {
    this.orders = [];
  }
}

@appRepository(ICustomerRepositoryToken)
class CustomerRepository implements IResettable {
  customers = ['alice'];

  reset(): void {
    this.customers = [];
  }
}

@perRequest()
@service(IOrderServiceToken, singleton())
class OrderService {
  constructor(@inject(by(IOrderRepositoryToken)) private readonly orders: OrderRepository) {}

  total(): number {
    return this.orders.orders.reduce((sum, o) => sum + o.total, 0);
  }
}

// Only requests opened with the `admin` tag get this one.
@perRequest('admin')
@service(IRefundServiceToken, singleton())
class RefundService {
  constructor(@inject(by(IOrderRepositoryToken)) private readonly orders: OrderRepository) {}

  refund(orderId: string): void {
    this.orders.orders = this.orders.orders.filter((o) => o.id !== orderId);
  }
}

describe('Layer and scope decorators', () => {
  const createApp = () =>
    new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(OrderRepository))
      .addRegistration(R.fromClass(CustomerRepository))
      .addRegistration(R.fromClass(OrderService))
      .addRegistration(R.fromClass(RefundService));

  it('registers each class in the scope its decorator names', () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });

    expect(IOrderServiceToken.resolve(request).total()).toBe(30);
    expect(() => IOrderServiceToken.resolve(app)).toThrow(DependencyNotFoundError); // not an app-level service
    expect(IOrderRepositoryToken.resolve(request)).toBe(IOrderRepositoryToken.resolve(app)); // one per app
  });

  it('narrows a scope decorator by name', () => {
    const app = createApp();
    const admin = app.createScope({ tags: ['request', 'admin'] });
    const regular = app.createScope({ tags: ['request'] });

    IRefundServiceToken.resolve(admin).refund('o-1');

    expect(IOrderServiceToken.resolve(regular).total()).toBe(0);
    expect(() => IRefundServiceToken.resolve(regular)).toThrow(DependencyNotFoundError);
  });

  it('lists a whole layer from any scope', () => {
    const app = createApp();
    const request = app.createScope({ tags: ['request'] });

    // e.g. between tests: wipe every repository, whatever the feature
    for (const repo of IRepositoryToken.resolve(request)) repo.reset();

    expect(IOrderRepositoryToken.resolve(app).orders).toEqual([]);
    expect(ICustomerRepositoryToken.resolve(app).customers).toEqual([]);
    expect(IServiceToken.resolve(request)).toHaveLength(1); // OrderService; RefundService is admin-only
  });
});
