import 'reflect-metadata';
import { asSingleton, Container, forKey, perLevel, ProviderBuilder, ProviderNotFoundError } from '../lib';
import { inject, IocInjector } from './ioc/IocInjector';
import { composeDecorators } from 'ts-constructor-injector';

const injector = new IocInjector();

export const perRoot = composeDecorators(perLevel(0), asSingleton);
export const scoped = composeDecorators(perLevel(1), asSingleton);

const IRepositoryKey = Symbol('IRepository');

interface IRepository {
    id: string;
}

@scoped
@forKey(IRepositoryKey)
class Repository implements IRepository {
    id = Math.random().toString(10);
}

@perRoot
@forKey(IRepositoryKey)
class Repository2 implements IRepository {
    id = Math.random().toString(10);
}

class Main {
    constructor(@inject((l) => l.resolve(IRepositoryKey)) private repository: IRepository) {}

    greeting(): string {
        return `Hello ${this.repository.id}`;
    }
}

class Main2 {
    constructor(@inject((l) => l.resolve(IRepositoryKey)) private repository: IRepository) {}

    greeting(): string {
        return `Hello ${this.repository.id}`;
    }
}

describe('live example', function () {
    it('should resolve the same repo from the same scope', function () {
        const container = new Container(injector).register(ProviderBuilder.fromClass(Repository).build());

        const scope = container.createScope();
        const main1 = scope.resolve(Main);
        const main2 = scope.resolve(Main);

        expect(main1.greeting()).toBe(main2.greeting());
    });

    it('should resolve the different repo from different scopes', function () {
        const container = new Container(injector).register(ProviderBuilder.fromClass(Repository).build());

        const scope1 = container.createScope();
        const scope2 = container.createScope();
        const main1 = scope1.resolve(Main);
        const main2 = scope2.resolve(Main);

        expect(main1.greeting()).not.toBe(main2.greeting());
    });

    it('should throw error if try to resolve from root scope', function () {
        const container = new Container(injector).register(ProviderBuilder.fromClass(Repository).build());
        expect(() => container.resolve(Main)).toThrow(ProviderNotFoundError);
    });

    it('should resolve singleton', function () {
        const container = new Container(injector).register(ProviderBuilder.fromClass(Repository2).build());

        const scope = container.createScope();
        const main1 = scope.resolve(Main2);
        const main2 = scope.resolve(Main2);
        const main3 = container.resolve(Main2);

        expect(main1.greeting()).toBe(main2.greeting());
        expect(main2.greeting()).toBe(main3.greeting());
    });
});
