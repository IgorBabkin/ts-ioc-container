import 'reflect-metadata';
import { singleton, Container, key, provider, Registration as R, scope, register } from '../lib';

@register(key('ILogger'), scope((s) => s.hasTag('root')))
@provider(singleton()) // the same as .pipe(singleton(), scope((s) => s.hasTag('root')))
class Logger {}
describe('ScopeProvider', function () {
  it('should return the same instance', function () {
    const root = new Container({ tags: ['root'] }).add(R.toClass(Logger));
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});
