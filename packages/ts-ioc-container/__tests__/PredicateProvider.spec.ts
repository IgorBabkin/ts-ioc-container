import 'reflect-metadata';
import { singleton, Container, key, whenScope, provider, MetadataInjector, Registration as R } from '../lib';

@key('ILogger')
@provider(singleton(), whenScope((s) => s.hasTag('root'))) // the same as .pipe(singleton(), tags('root'))
class Logger {}
describe('PredicateProvider', function () {
  it('should return the same instance', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] }).use(R.fromClass(Logger));
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});
