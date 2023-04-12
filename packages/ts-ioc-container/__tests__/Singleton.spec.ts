import 'reflect-metadata';
import { asSingleton, constructor, Container, forKey, IContainer, IInjector, Injector, ProviderBuilder } from '../lib';
import { resolve } from 'ts-constructor-injector';

export class IocInjector extends Injector {
    clone(): IInjector {
        return new IocInjector();
    }

    protected resolver<T>(container: IContainer, value: constructor<T>, ...args: any[]): T {
        return resolve(container)(value, ...args);
    }
}

@asSingleton
@forKey('logger')
class Logger {}

describe('Singleton', function () {
    function createContainer() {
        return new Container(new IocInjector());
    }

    it('should resolve the same container per every request', function () {
        const container = createContainer().register(ProviderBuilder.fromClass(Logger).build());

        expect(container.resolve('logger')).toBe(container.resolve('logger'));
    });
});
