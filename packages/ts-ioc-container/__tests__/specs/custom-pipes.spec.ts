import 'reflect-metadata';
import {
  Container,
  type IProvider,
  type IRegistration,
  type RegistrationMapper,
  register,
  registerPipe,
  Registration as R,
  SingleToken,
  toBindToken,
  toProviderFn,
  toRegistrationFn,
} from '../../lib';

describe('Spec: custom pipes', () => {
  it('builds a reusable pipe with registerPipe that works in @register and in .pipe', () => {
    const suffix = (text: string) => registerPipe<Greeter>((p) => p.map((greeter) => greeter.append(text)));

    class Greeter {
      constructor(readonly message = 'hello') {}

      append(text: string) {
        return new Greeter(`${this.message}${text}`);
      }
    }

    @register(suffix('!'))
    class Decorated extends Greeter {}

    const container = new Container()
      .addRegistration(R.fromClass(Decorated))
      .addRegistration(R.fromClass(Greeter).pipe(suffix('?')));

    expect(container.resolve<Greeter>('Decorated').message).toBe('hello!');
    expect(container.resolve<Greeter>('Greeter').message).toBe('hello?');
  });

  it('normalizes every accepted mapper shape through toRegistrationFn', () => {
    class Logger {}

    const mappers: RegistrationMapper[] = [
      'ByKey', // DependencyKey
      new SingleToken('ByToken'), // BindToken
      registerPipe((p: IProvider) => p.singleton()), // ProviderPipe
      (r) => r.bindToAlias('ByFn'), // MapFn<IRegistration>
    ];

    const registration = mappers
      .map(toRegistrationFn)
      .reduce<IRegistration>((r, mapper) => mapper(r), R.fromClass(Logger));

    const container = new Container().addRegistration(registration);

    // the last bindTo wins as the key, both aliases and the singleton pipe are applied
    expect(container.resolve('ByToken')).toBe(container.resolve('ByToken'));
    expect(container.resolveOneByAlias('ByFn')).toBeInstanceOf(Logger);
  });

  it('turns a raw key into a token with toBindToken and a pipe into a fn with toProviderFn', () => {
    class Service {}

    const registration = R.fromClass(Service).pipe(toProviderFn(registerPipe((p: IProvider) => p.singleton())));
    toBindToken('IService').bindTo(registration);

    const container = new Container().addRegistration(registration);

    expect(container.resolve('IService')).toBe(container.resolve('IService'));
  });
});
