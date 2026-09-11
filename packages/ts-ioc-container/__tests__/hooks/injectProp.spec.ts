import 'reflect-metadata';
import { append, Container, hook, SequentialSyncHookExecutionStrategy, injectProp, Registration as R } from '../../lib';

describe('injectProp(token, ...mappers)', () => {
  function createViewModel<T extends object>(Target: new () => T, container: Container) {
    const strategy = new SequentialSyncHookExecutionStrategy({ key: 'onInit' });
    const instance = container.resolve(Target);
    strategy.execute(instance, { scope: container });
    return instance;
  }

  it('assigns the whole dependency when no mapper is given', () => {
    class ViewModel {
      @hook('onInit', append(injectProp('Greeting')))
      greeting!: string;
    }

    const container = new Container().addRegistration(R.fromValue('hello').bindToKey('Greeting'));

    expect(createViewModel(ViewModel, container).greeting).toBe('hello');
  });

  it('pipes the resolved dependency through every mapper, left to right', () => {
    const trim = () => (value: string) => value.trim();
    const upper = () => (value: string) => value.toUpperCase();
    const exclaim = () => (value: string) => `${value}!`;

    class ViewModel {
      @hook('onInit', append(injectProp('Greeting', trim(), upper(), exclaim())))
      greeting!: string;
    }

    const container = new Container().addRegistration(R.fromValue('  hello  ').bindToKey('Greeting'));

    expect(createViewModel(ViewModel, container).greeting).toBe('HELLO!');
  });

  it('accepts a spread list of mappers', () => {
    const mappers = [(value: string) => `${value}-a`, (value: string) => `${value}-b`];

    class ViewModel {
      @hook('onInit', append(injectProp('Greeting', ...mappers)))
      greeting!: string;
    }

    const container = new Container().addRegistration(R.fromValue('hello').bindToKey('Greeting'));

    expect(createViewModel(ViewModel, container).greeting).toBe('hello-a-b');
  });

  it('maps a class dependency down to one of its members', () => {
    class Config {
      readonly apiUrl = 'https://api.com';
    }

    class ViewModel {
      @hook('onInit', append(injectProp(Config, (config) => config.apiUrl)))
      apiUrl!: string;
    }

    const container = new Container().addRegistration(R.fromClass(Config));

    expect(createViewModel(ViewModel, container).apiUrl).toBe('https://api.com');
  });
});
