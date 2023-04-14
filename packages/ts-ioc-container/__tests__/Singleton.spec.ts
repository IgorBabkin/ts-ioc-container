import 'reflect-metadata';
import { asSingleton, constructor, Container, forKey, IContainer, IInjector, ProviderBuilder } from '../lib';
import { resolve } from 'ts-constructor-injector';

const injector: IInjector = {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
        return resolve(container)(value, ...deps);
    },
};

@asSingleton
@forKey('logger')
class Logger {}

describe('Singleton', function () {
    function createContainer() {
        return new Container(injector);
    }

    it('should resolve the same container per every request', function () {
        const container = createContainer().register(ProviderBuilder.fromClass(Logger).build());

        expect(container.resolve('logger')).toBe(container.resolve('logger'));
    });
});
