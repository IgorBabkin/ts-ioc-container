import 'reflect-metadata';
import {
  arg,
  args,
  bindTo,
  ClassToken,
  ConstantToken,
  Container,
  findOrFail,
  FunctionToken,
  GroupAliasToken,
  GroupInstanceToken,
  inject,
  MethodNotImplementedError,
  register,
  Registration as R,
  select,
  singleton,
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
    const computed = new FunctionToken(({ scope }) => scope.resolve<Repository>('Repository').name).resolve(container);
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
        @inject(arg(0)) readonly format: string,
        @inject(arg(1)) readonly tenant: string,
      ) {}
    }

    const token = new SingleToken<Report>('Report');
    const specialized = token.args('pdf').argsFn(() => ['tenant-a']);
    const container = new Container().addRegistration(R.fromClass(Report));

    expect(specialized.resolve(container)).toMatchObject({ format: 'pdf', tenant: 'tenant-a' });
    expect(token.resolve(container)).toMatchObject({ format: undefined, tenant: undefined });
    expect(specialized).not.toBe(token);
  });

  it('forwards runtime arguments through every container-backed token shape', () => {
    const container = new Container()
      .addRegistration(R.fromFn(({ args = [] }) => args).bindToKey('Echo'))
      .addRegistration(
        R.fromFn(({ args = [] }) => args)
          .bindToKey('AliasedEcho')
          .bindToAlias('EchoAlias'),
      );

    class EchoClass {
      constructor(@inject(args) readonly args: unknown[]) {}
    }

    expect(new SingleToken<unknown[]>('Echo').resolve(container, { args: ['a', 1] })).toEqual(['a', 1]);
    expect(new ClassToken(EchoClass).resolve(container, { args: ['a', 1] }).args).toEqual(['a', 1]);
    expect(new SingleAliasToken<unknown[]>('EchoAlias').resolve(container, { args: ['a', 1] })).toEqual(['a', 1]);
    expect(new GroupAliasToken<unknown[]>('EchoAlias').resolve(container, { args: ['a', 1] })).toEqual([['a', 1]]);
    expect(new FunctionToken(({ args = [] }) => args).resolve(container, { args: ['a', 1] })).toEqual(['a', 1]);
  });

  it('appends token arguments after the runtime arguments', () => {
    const container = new Container().addRegistration(R.fromFn(({ args = [] }) => args).bindToKey('Echo'));
    const token = new SingleToken<unknown[]>('Echo').args('static').argsFn(() => ['dynamic']);

    expect(token.resolve(container, { args: ['runtime'] })).toEqual(['runtime', 'static', 'dynamic']);
  });

  it('cascades the runtime arguments of a class into its injected dependencies', () => {
    const TenantRepositoryToken = new SingleToken<TenantRepository>('TenantRepository');

    class TenantRepository {
      constructor(@inject(arg(0)) readonly tenant: string) {}
    }

    class TenantService {
      constructor(
        @inject(({ scope, args }) => TenantRepositoryToken.resolve(scope, { args }))
        readonly repository: TenantRepository,
      ) {}
    }

    const container = new Container().addRegistration(
      R.fromClass(TenantRepository)
        .bindTo(TenantRepositoryToken)
        .pipe(singleton(findOrFail<string>((value) => typeof value === 'string'))),
    );

    const first = container.resolve(TenantService, { args: ['tenant-a'] });
    const same = container.resolve(TenantService, { args: ['tenant-a'] });
    const other = container.resolve(TenantService, { args: ['tenant-b'] });

    expect(first.repository.tenant).toBe('tenant-a');
    expect(same.repository).toBe(first.repository);
    expect(other.repository.tenant).toBe('tenant-b');
    expect(other.repository).not.toBe(first.repository);
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
