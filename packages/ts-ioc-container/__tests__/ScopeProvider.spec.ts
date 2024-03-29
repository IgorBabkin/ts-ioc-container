import 'reflect-metadata';
import { singleton, Container, key, provider, MetadataInjector, Registration as R, tags } from '../lib';

@key('ILogger')
@provider(singleton(), tags((s) => s.hasTag('root'))) // the same as .pipe(singleton(), scope((s) => s.hasTag('root')))
class Logger {}
describe('ScopeProvider', function () {
  it('should return the same instance', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] }).use(R.fromClass(Logger));
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});
