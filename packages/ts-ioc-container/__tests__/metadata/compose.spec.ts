import {
  addClassMeta,
  addMethodMeta,
  addParamMeta,
  Container,
  createComposeClassDecorator,
  createComposeMethodDecorator,
  createComposeParameterDecorator,
  getClassMeta,
  getMethodMeta,
  getParamMeta,
  register,
  Registration as R,
  singleton,
  SingleToken,
} from '../../lib';

// A decorator stack that reads the same on every class it is put on is worth a name.
// `compose*Decorators` gives it one without changing what stacking would have done.
describe('createComposeClassDecorator', () => {
  const ORDER_KEY = 'order';
  const track = (label: string) => addClassMeta(ORDER_KEY, (prev: string[] = []) => [...prev, label]);

  it('should apply every decorator it is given', () => {
    @createComposeClassDecorator(addClassMeta('role', () => 'service'), addClassMeta('layer', () => 'domain'))
    class MyService {}

    expect(getClassMeta(MyService, 'role')).toBe('service');
    expect(getClassMeta(MyService, 'layer')).toBe('domain');
  });

  it('should apply decorators bottom-up, exactly as stacking them would', () => {
    @createComposeClassDecorator(track('outer'), track('inner'))
    class Composed {}

    @track('outer')
    @track('inner')
    class Stacked {}

    expect(getClassMeta(Composed, ORDER_KEY)).toEqual(['inner', 'outer']);
    expect(getClassMeta(Composed, ORDER_KEY)).toEqual(getClassMeta(Stacked, ORDER_KEY));
  });

  it('should thread a replacement class to the next decorator and return the last one', () => {
    const seen: string[] = [];
    class Inner {}
    class Outer {}
    const replaceWith = (label: string, Replacement: object) =>
      ((Target: { name: string }) => {
        seen.push(`${label}:${Target.name}`);
        return Replacement;
      }) as ClassDecorator;

    class Origin {}
    const result = createComposeClassDecorator(replaceWith('outer', Outer), replaceWith('inner', Inner))(Origin);

    expect(seen).toEqual(['inner:Origin', 'outer:Inner']);
    expect(result).toBe(Outer);
  });

  it('should leave the class untouched when composing nothing', () => {
    class MyService {}

    expect(createComposeClassDecorator()(MyService)).toBe(MyService);
    expect(getClassMeta(MyService, ORDER_KEY)).toBeUndefined();
  });

  it('should compose @register with other class decorators into one named decorator', () => {
    const INJECTION_TOKEN = 'injection-token';
    const repository = <T>(token: SingleToken<T>) =>
      createComposeClassDecorator(
        register(token, singleton()),
        addClassMeta(INJECTION_TOKEN, () => token),
      );

    const UserRepositoryToken = new SingleToken<UserRepository>('IUserRepository');

    @repository(UserRepositoryToken)
    class UserRepository {}

    const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(UserRepository));

    expect(UserRepositoryToken.resolve(container)).toBeInstanceOf(UserRepository);
    expect(UserRepositoryToken.resolve(container)).toBe(UserRepositoryToken.resolve(container));
    expect(getClassMeta(UserRepository, INJECTION_TOKEN)).toBe(UserRepositoryToken);
  });
});

describe('createComposeMethodDecorator', () => {
  const ORDER_KEY = 'order';
  const track = (label: string) => addMethodMeta(ORDER_KEY, (prev: string[] = []) => [...prev, label]);

  it('should apply every decorator it is given', () => {
    class MyService {
      @createComposeMethodDecorator(addMethodMeta('level', () => 'info'), addMethodMeta('retries', () => 3))
      start() {}
    }

    expect(getMethodMeta('level', MyService, 'start')).toBe('info');
    expect(getMethodMeta('retries', MyService, 'start')).toBe(3);
  });

  it('should apply decorators bottom-up, exactly as stacking them would', () => {
    class MyService {
      @createComposeMethodDecorator(track('outer'), track('inner'))
      composed() {}

      @track('outer')
      @track('inner')
      stacked() {}
    }

    expect(getMethodMeta(ORDER_KEY, MyService, 'composed')).toEqual(['inner', 'outer']);
    expect(getMethodMeta(ORDER_KEY, MyService, 'composed')).toEqual(getMethodMeta(ORDER_KEY, MyService, 'stacked'));
  });

  it('should thread the descriptor, so wrapping decorators compose', () => {
    const wrap =
      (label: string): MethodDecorator =>
      (_target, _propertyKey, descriptor) => {
        const original = descriptor.value as unknown as () => string;
        return {
          ...descriptor,
          value: function (this: unknown) {
            return `${label}(${original.call(this)})`;
          },
        } as typeof descriptor;
      };

    class MyService {
      @createComposeMethodDecorator(wrap('outer'), wrap('inner'))
      composed() {
        return 'value';
      }

      @wrap('outer')
      @wrap('inner')
      stacked() {
        return 'value';
      }
    }

    const service = new MyService();
    expect(service.composed()).toBe('outer(inner(value))');
    expect(service.composed()).toBe(service.stacked());
  });

  it('should leave the method untouched when composing nothing', () => {
    class MyService {
      @createComposeMethodDecorator()
      start() {
        return 'value';
      }
    }

    expect(new MyService().start()).toBe('value');
    expect(getMethodMeta(ORDER_KEY, MyService, 'start')).toBeUndefined();
  });
});

describe('createComposeParameterDecorator', () => {
  const ORDER_KEY = 'order';
  const track = (label: string) => addParamMeta(ORDER_KEY, (prev: unknown) => [...((prev as string[]) ?? []), label]);

  it('should apply every decorator it is given', () => {
    class MyService {
      constructor(
        @createComposeParameterDecorator(addParamMeta('role', () => 'db'), addParamMeta('scope', () => 'request'))
        _db: unknown,
      ) {}
    }

    expect(getParamMeta('role', MyService)[0]).toBe('db');
    expect(getParamMeta('scope', MyService)[0]).toBe('request');
  });

  it('should apply decorators bottom-up, exactly as stacking them would', () => {
    class Composed {
      constructor(@createComposeParameterDecorator(track('outer'), track('inner')) _db: unknown) {}
    }

    class Stacked {
      constructor(
        @track('outer')
        @track('inner')
        _db: unknown,
      ) {}
    }

    expect(getParamMeta(ORDER_KEY, Composed)[0]).toEqual(['inner', 'outer']);
    expect(getParamMeta(ORDER_KEY, Composed)[0]).toEqual(getParamMeta(ORDER_KEY, Stacked)[0]);
  });

  it('should decorate each parameter independently', () => {
    class MyService {
      constructor(
        @createComposeParameterDecorator(track('first')) _db: unknown,
        @createComposeParameterDecorator(track('second')) _logger: unknown,
      ) {}
    }

    expect(getParamMeta(ORDER_KEY, MyService)).toEqual([['first'], ['second']]);
  });

  it('should leave the parameter untouched when composing nothing', () => {
    class MyService {
      constructor(@createComposeParameterDecorator() _db: unknown) {}
    }

    expect(getParamMeta(ORDER_KEY, MyService)).toEqual([]);
  });
});
