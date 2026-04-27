import 'reflect-metadata';
import {
  args,
  bindTo,
  ClassToken,
  ConstantToken,
  Container,
  FunctionToken,
  GroupAliasToken,
  GroupInstanceToken,
  inject,
  MethodNotImplementedError,
  register,
  Registration as R,
  select,
  SingleAliasToken,
  SingleToken,
  toGroupAlias,
  toSingleAlias,
} from '../../lib';
import { UnsupportedTokenTypeError } from '../../lib/errors/UnsupportedTokenTypeError';

describe('Spec: token-based injection', () => {
  it('resolves the supported token shapes', () => {
    @register(bindTo(toSingleAlias('SingleRepository')))
    class Repository {
      readonly name = 'repository';
    }

    @register(bindTo(toGroupAlias('PluginGroup')))
    class Plugin {
      readonly name = 'plugin';
    }

    const container = new Container().addRegistration(R.fromClass(Repository)).addRegistration(R.fromClass(Plugin));

    const repository = new SingleToken<Repository>('Repository').resolve(container);
    const classInstance = new ClassToken(Repository).resolve(container);
    const computed = new FunctionToken((scope) => scope.resolve<Repository>('Repository').name).resolve(container);
    const constant = new ConstantToken('literal').resolve(container);
    const singleAlias = new SingleAliasToken<Repository>('SingleRepository').resolve(container);
    const groupAlias = new GroupAliasToken<Plugin>('PluginGroup').resolve(container);
    const trackedRepositories = new GroupInstanceToken((item) => item instanceof Repository).resolve(container);

    expect(repository).toBeInstanceOf(Repository);
    expect(classInstance).toBeInstanceOf(Repository);
    expect(computed).toBe('repository');
    expect(constant).toBe('literal');
    expect(singleAlias).toBeInstanceOf(Repository);
    expect(groupAlias).toHaveLength(1);
    expect(trackedRepositories.length).toBeGreaterThanOrEqual(2);
  });

  it('composes token arguments immutably', () => {
    class Report {
      constructor(
        @inject(args(0)) readonly format: string,
        @inject(args(1)) readonly tenant: string,
      ) {}
    }

    const token = new SingleToken<Report>('Report');
    const specialized = token.args('pdf').argsFn(() => ['tenant-a']);
    const container = new Container().addRegistration(R.fromClass(Report));

    expect(specialized.resolve(container)).toMatchObject({ format: 'pdf', tenant: 'tenant-a' });
    expect(token.resolve(container)).toMatchObject({ format: undefined, tenant: undefined });
    expect(specialized).not.toBe(token);
  });

  it('configures lazy token resolution without mutating the original token', () => {
    class HeavyService {
      static constructed = 0;

      constructor() {
        HeavyService.constructed += 1;
      }

      ping(): string {
        return 'pong';
      }
    }

    const token = new SingleToken<HeavyService>('HeavyService');
    const lazyToken = token.lazy();
    const container = new Container().addRegistration(R.fromClass(HeavyService));

    const service = lazyToken.resolve(container);

    expect(lazyToken).not.toBe(token);
    expect(HeavyService.constructed).toBe(0);
    expect(service.ping()).toBe('pong');
    expect(HeavyService.constructed).toBe(1);
  });

  it('selects derived values and scope helpers', () => {
    class Plugin {
      constructor(readonly name: string) {}
    }

    const PluginGroup = toGroupAlias<Plugin>('PluginGroup');
    const container = new Container({ tags: ['application'] })
      .addRegistration(R.fromValue(new Plugin('alpha')).bindTo('AlphaPlugin').bindTo(PluginGroup))
      .addRegistration(R.fromValue(new Plugin('beta')).bindTo('BetaPlugin').bindTo(PluginGroup));

    expect(new SingleToken<Plugin>('AlphaPlugin').select((plugin) => plugin.name)(container)).toBe('alpha');
    expect(PluginGroup.select((plugins) => plugins.map((plugin) => plugin.name))(container)).toEqual(['alpha', 'beta']);
    expect(select.scope.current.resolve(container)).toBe(container);
    expect(
      select.scope
        .create({ tags: ['request'] })
        .resolve(container)
        .hasTag('request'),
    ).toBe(true);
  });

  it('controls instance collection scope with cascade', () => {
    class Repo {}

    const app = new Container();
    const child = app.createScope();
    child.resolve(Repo);

    const token = new GroupInstanceToken((item) => item instanceof Repo);

    expect(token.resolve(app).length).toBeGreaterThanOrEqual(1);

    token.cascade(false);

    expect(token.resolve(app)).toHaveLength(0);
    expect(token.resolve(child)).toHaveLength(1);
  });

  it('normalizes supported token inputs and rejects unsupported input', () => {
    class Service {}

    expect(select.token('Service')).toBeInstanceOf(SingleToken);
    expect(select.token(Service)).toBeInstanceOf(ClassToken);
    expect(select.token(() => 'value')).toBeInstanceOf(FunctionToken);
    expect(toSingleAlias('Alias')).toBeInstanceOf(SingleAliasToken);
    expect(toGroupAlias('Group')).toBeInstanceOf(GroupAliasToken);
    expect(() => select.token({} as never)).toThrowError(UnsupportedTokenTypeError);
    expect(() => new ConstantToken('value').lazy()).toThrowError(MethodNotImplementedError);
  });
});
