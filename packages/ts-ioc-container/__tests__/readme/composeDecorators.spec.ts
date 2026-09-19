import {
  addClassMeta,
  Container,
  createComposeClassDecorator,
  createComposeParameterDecorator,
  getClassMeta,
  inject,
  by,
  addParamLabel,
  getParamLabels,
  register,
  Registration as R,
  scope,
  singleton,
  SingleToken,
} from '../../lib';

/**
 * A decorator stack repeated on every class of a layer is worth a name.
 * `createComposeClassDecorator` (and its `createComposeMethodDecorator` /
 * `createComposeParameterDecorator` siblings) turns one into a single decorator,
 * applied bottom-up exactly as stacking would.
 */
describe('composing decorators', () => {
  const INJECTION_TOKEN = 'injection-token';

  // Every repository binds to its own token, is an application-scoped singleton,
  // and remembers the token it was registered under.
  const repository = <T>(token: SingleToken<T>) =>
    createComposeClassDecorator(
      register(
        token,
        scope((s) => s.hasTag('application')),
        singleton(),
      ),
      addClassMeta(INJECTION_TOKEN, () => token),
    );

  it('should apply the whole stack the composed decorator stands for', () => {
    const UserRepositoryToken = new SingleToken<UserRepository>('IUserRepository');

    @repository(UserRepositoryToken)
    class UserRepository {
      findById(id: string) {
        return { id };
      }
    }

    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(UserRepository));

    expect(UserRepositoryToken.resolve(app)).toBeInstanceOf(UserRepository);
    // singleton() applied, so the same instance comes back
    expect(UserRepositoryToken.resolve(app)).toBe(UserRepositoryToken.resolve(app));
    // and the class still carries the metadata written beside the registration
    expect(getClassMeta(UserRepository, INJECTION_TOKEN)).toBe(UserRepositoryToken);
  });

  it('should compose parameter decorators the same way', () => {
    const ConfigToken = new SingleToken<{ apiUrl: string }>('IConfig');

    // @inject plus a label describing where the value came from
    const fromConfig = createComposeParameterDecorator(inject(by(ConfigToken)), addParamLabel('source', 'config'));

    class ApiClient {
      constructor(@fromConfig public config: { apiUrl: string }) {}
    }

    const app = new Container({ tags: ['application'] }).addRegistration(
      R.fromValue({ apiUrl: 'https://api.example.com' }).bindTo(ConfigToken),
    );

    expect(app.resolve(ApiClient).config.apiUrl).toBe('https://api.example.com');
    expect(getParamLabels(ApiClient, 0).get('source')).toBe('config');
  });
});
