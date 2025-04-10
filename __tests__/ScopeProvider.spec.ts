import 'reflect-metadata';
import { singleton, Container, Registration as R, scope, register, asKey } from '../lib';

@register(asKey('ILogger'), scope((s) => s.hasTag('root')), singleton())
class Logger {}
describe('ScopeProvider', function () {
  it('should return the same instance', function () {
    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope();
    expect(root.resolveOne('ILogger')).toBe(child.resolveOne('ILogger'));
  });
});
