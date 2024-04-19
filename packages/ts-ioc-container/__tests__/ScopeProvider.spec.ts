import 'reflect-metadata';
import { singleton, Container, key, MetadataInjector, Registration as R, scope, register } from '../lib';

@register(key('ILogger'), scope((s) => s.hasTag('root')), singleton()) // the same as .pipe(singleton(), scope((s) => s.hasTag('root')))
class Logger {}
describe('ScopeProvider', function () {
  it('should return the same instance', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] }).add(R.fromClass(Logger));
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});
