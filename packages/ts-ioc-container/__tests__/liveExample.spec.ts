import 'reflect-metadata';
import {
    constructor,
    ContainerBuilder,
    createAddKeysDecorator,
    createLevelDecorator,
    createSingletonDecorator,
    fromClass as fromConstructor,
    ProviderNotFoundError,
    ProvidersMetadataCollector,
} from '../lib';
import { inject, IocInjector, withoutLogs as w } from './ioc/IocInjector';
import { composeClassDecorators } from 'ts-constructor-injector';

export const containerBuilder = new ContainerBuilder(new IocInjector());

const metadataCollector = ProvidersMetadataCollector.create();

export const keys = createAddKeysDecorator(metadataCollector);

const single = createSingletonDecorator(metadataCollector);
const level = createLevelDecorator(metadataCollector);
export const singleton = composeClassDecorators(level(0), single);
export const scoped = composeClassDecorators(level(1), single);

export const fromClass = <T>(target: constructor<T>) =>
    fromConstructor(target).withReducer(metadataCollector.findReducerOrCreate(target));

const IRepositoryKey = Symbol('IRepository');

interface IRepository {
    id: string;
}

@scoped
@keys(IRepositoryKey)
class Repository implements IRepository {
    id = Math.random().toString(10);
}

@singleton
@keys(IRepositoryKey)
class Repository2 implements IRepository {
    id = Math.random().toString(10);
}

class Main {
    constructor(@inject(w((l) => l.resolve(IRepositoryKey))) private repository: IRepository) {}

    greeting(): string {
        return `Hello ${this.repository.id}`;
    }
}

class Main2 {
    constructor(@inject(w((l) => l.resolve(IRepositoryKey))) private repository: IRepository) {}

    greeting(): string {
        return `Hello ${this.repository.id}`;
    }
}

describe('live example', function () {
    it('should resolve the same repo from the same scope', function () {
        const container = containerBuilder.build().register(fromClass(Repository).build());

        const scope = container.createScope();
        const main1 = scope.resolve(Main);
        const main2 = scope.resolve(Main);

        expect(main1.greeting()).toBe(main2.greeting());
    });

    it('should resolve the different repo from different scopes', function () {
        const container = containerBuilder.build().register(fromClass(Repository).build());

        const scope1 = container.createScope();
        const scope2 = container.createScope();
        const main1 = scope1.resolve(Main);
        const main2 = scope2.resolve(Main);

        expect(main1.greeting()).not.toBe(main2.greeting());
    });

    it('should throw error if try to resolve from root scope', function () {
        const container = containerBuilder.build().register(fromClass(Repository).build());
        expect(() => container.resolve(Main)).toThrow(ProviderNotFoundError);
    });

    it('should resolve singleton', function () {
        const container = containerBuilder.build().register(fromClass(Repository2).build());

        const scope = container.createScope();
        const main1 = scope.resolve(Main2);
        const main2 = scope.resolve(Main2);
        const main3 = container.resolve(Main2);

        expect(main1.greeting()).toBe(main2.greeting());
        expect(main2.greeting()).toBe(main3.greeting());
    });
});
