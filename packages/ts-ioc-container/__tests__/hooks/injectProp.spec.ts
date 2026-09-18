import 'reflect-metadata';
import { HookCollector, Container, hook, injectProp, pipe, Registration as R, by } from '../../lib';
import { perform, runSync } from './runners';

describe('injectProp(fn)', () => {
  function createViewModel<T extends object>(Target: new () => T, container: Container) {
    const runOnInit = perform(runSync(), new HookCollector({ key: 'onInit' }));
    const instance = container.resolve(Target);
    runOnInit(instance, { scope: container });
    return instance;
  }

  it('assigns whatever the function returns', () => {
    class ViewModel {
      @hook('onInit', injectProp(by('Greeting')))
      greeting!: string;
    }

    const container = new Container().addRegistration(R.fromValue('hello').bindToKey('Greeting'));

    expect(createViewModel(ViewModel, container).greeting).toBe('hello');
  });

  it('composes with pipe to map the dependency, left to right', () => {
    const trim = () => (value: string) => value.trim();
    const upper = () => (value: string) => value.toUpperCase();
    const exclaim = () => (value: string) => `${value}!`;

    class ViewModel {
      @hook('onInit', injectProp(pipe(by<string>('Greeting'), trim(), upper(), exclaim())))
      greeting!: string;
    }

    const container = new Container().addRegistration(R.fromValue('  hello  ').bindToKey('Greeting'));

    expect(createViewModel(ViewModel, container).greeting).toBe('HELLO!');
  });

  it('maps a class dependency down to one of its members', () => {
    class Config {
      readonly apiUrl = 'https://api.com';
    }

    class ViewModel {
      @hook('onInit', injectProp(pipe(by(Config), (config) => config.apiUrl)))
      apiUrl!: string;
    }

    const container = new Container().addRegistration(R.fromClass(Config));

    expect(createViewModel(ViewModel, container).apiUrl).toBe('https://api.com');
  });
});
