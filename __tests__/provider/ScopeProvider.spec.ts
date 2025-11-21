import { bindTo, Container, register, Registration as R, scope, singleton } from '../../lib';

@register(bindTo('ILogger'), scope((s) => s.hasTag('root')), singleton())
class Logger {}
describe('ScopeProvider', function () {
  it('should return the same instance', function () {
    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});
