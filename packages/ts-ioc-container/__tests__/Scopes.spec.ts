import 'reflect-metadata';
import {
    asSingleton,
    constructor,
    Container,
    forKey,
    IContainer,
    IInjector,
    Injector,
    perTags,
    ProviderBuilder,
} from '../lib';
import { composeDecorators, resolve } from 'ts-constructor-injector';

export class IocInjector extends Injector {
    clone(): IInjector {
        return new IocInjector();
    }

    protected resolver<T>(container: IContainer, value: constructor<T>, ...args: any[]): T {
        return resolve(container)(value, ...args);
    }
}

const perHome = composeDecorators(asSingleton, perTags('home'));

@perHome
@forKey('logger')
class Logger {}

describe('Singleton', function () {
    it('should resolve the same dependency if provider registered per root', function () {
        const container = new Container(new IocInjector(), { tags: ['home'] }).register(
            ProviderBuilder.fromClass(Logger).build(),
        );

        const child1 = container.createScope();
        const child2 = container.createScope();

        expect(child1.resolve('logger')).toBe(child2.resolve('logger'));
    });

    it('should resolve unique dependency for every registered scope', function () {
        const container = new Container(new IocInjector()).register(ProviderBuilder.fromClass(Logger).build());

        const child1 = container.createScope(['home']);
        const child2 = container.createScope(['home']);

        expect(child1.resolve('logger')).not.toBe(child2.resolve('logger'));
    });

    it('should resolve unique dependency if registered scope has another registered scope', function () {
        const container = new Container(new IocInjector(), { tags: ['home'] }).register(
            ProviderBuilder.fromClass(Logger).build(),
        );

        const child1 = container.createScope(['home']);

        expect(child1.resolve('logger')).not.toBe(container.resolve('logger'));
    });
});
