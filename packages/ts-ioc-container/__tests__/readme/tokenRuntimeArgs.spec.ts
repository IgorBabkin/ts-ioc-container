import {
  arg,
  bindTo,
  Container,
  findOrFail,
  inject,
  register,
  Registration as R,
  singleton,
  SingleToken,
  by,
} from '../../lib';

interface IUserRepository {
  userId: string;
}

const IUserRepositoryKey = new SingleToken<IUserRepository>('IUserRepository');
const isUserId = (value: unknown): value is string => typeof value === 'string';

// one repository per user id - the id is the singleton cache key
@register(bindTo(IUserRepositoryKey), singleton(findOrFail<string>(isUserId)))
class UserRepository implements IUserRepository {
  constructor(@inject(arg(0)) public userId: string) {}
}

class UserService {
  constructor(@inject(by(IUserRepositoryKey)) public repository: IUserRepository) {}
}

describe('Token Runtime Arguments', function () {
  it('should forward runtime args to the provider behind the token', function () {
    const container = new Container().addRegistration(R.fromClass(UserRepository));

    expect(IUserRepositoryKey.resolve(container, { args: ['user-1'] }).userId).toBe('user-1');
  });

  it('should cascade the runtime args of a class into its injected dependencies', function () {
    const container = new Container().addRegistration(R.fromClass(UserRepository));

    const service = container.resolve(UserService, { args: ['user-1'] });
    const sameUser = container.resolve(UserService, { args: ['user-1'] });
    const otherUser = container.resolve(UserService, { args: ['user-2'] });

    expect(service.repository.userId).toBe('user-1');
    expect(sameUser.repository).toBe(service.repository);
    expect(otherUser.repository.userId).toBe('user-2');
  });
});
