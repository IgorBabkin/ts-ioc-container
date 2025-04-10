import 'reflect-metadata';
import { asKey, Container, register, Registration as R, singleton } from '../lib';

@register(asKey('logger'), singleton())
class Logger {}

describe('Singleton', function () {
  function createContainer() {
    return new Container();
  }

  it('should resolve the same container per every request', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));

    expect(container.resolveOne('logger')).toBe(container.resolveOne('logger'));
  });

  it('should resolve different dependency per scope', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));
    const child = container.createScope();

    expect(container.resolveOne('logger')).not.toBe(child.resolveOne('logger'));
  });

  it('should resolve the same dependency for scope', function () {
    const container = createContainer().addRegistration(R.fromClass(Logger));
    const child = container.createScope();

    expect(child.resolveOne('logger')).toBe(child.resolveOne('logger'));
  });
});
