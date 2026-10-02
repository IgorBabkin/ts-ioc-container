import {
  ArgumentNotFoundError,
  byArgs,
  Container,
  findArgOrFail,
  inject,
  type InjectionToken,
  register,
  Registration as R,
  singleton,
  SingleToken,
} from '../../lib';

interface IRepository {
  name: string;
}

// a repository token carries its own marker, so it can be found among the runtime args
class RepositoryToken<T extends IRepository> extends SingleToken<T> {}
const isRepositoryToken = (value: unknown): value is InjectionToken<IRepository> => value instanceof RepositoryToken;
const repositoryTokenOf = findArgOrFail<InjectionToken<IRepository>>(isRepositoryToken);

const IUserRepositoryToken = new RepositoryToken<IRepository>('IUserRepository');
const IOrderRepositoryToken = new RepositoryToken<IRepository>('IOrderRepository');
const IEntityManagerToken = new SingleToken<EntityManager>('IEntityManager');

@register(IUserRepositoryToken)
class UserRepository implements IRepository {
  name = 'users';
}

@register(IOrderRepositoryToken)
class OrderRepository implements IRepository {
  name = 'orders';
}

// the caller chooses the repository; one entity manager per repository token
@register(IEntityManagerToken, singleton(repositoryTokenOf))
class EntityManager {
  constructor(@inject(byArgs(repositoryTokenOf)) readonly repository: IRepository) {}
}

describe('byArgs', function () {
  const createContainer = () =>
    new Container()
      .addRegistration(R.fromClass(UserRepository))
      .addRegistration(R.fromClass(OrderRepository))
      .addRegistration(R.fromClass(EntityManager));

  it('should resolve the token the caller passes as a runtime arg', function () {
    const container = createContainer();

    const users = IEntityManagerToken.resolve(container, { args: [IUserRepositoryToken] });
    const orders = IEntityManagerToken.resolve(container, { args: [IOrderRepositoryToken] });

    expect(users.repository.name).toBe('users');
    expect(orders.repository.name).toBe('orders');
    expect(IEntityManagerToken.resolve(container, { args: [IUserRepositoryToken] })).toBe(users);
  });

  it('should throw when no runtime arg matches', function () {
    const container = createContainer();

    expect(() => IEntityManagerToken.resolve(container, { args: ['not a token'] })).toThrow(ArgumentNotFoundError);
  });
});
