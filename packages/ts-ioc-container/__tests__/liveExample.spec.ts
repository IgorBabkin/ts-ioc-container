import 'reflect-metadata';
import {
    composeClassDecorators,
    constructor,
    ContainerBuilder,
    createAddKeysDecorator,
    createLevelDecorator,
    createSingletonDecorator,
    fromClass as fromConstructor,
    inject,
    IocInjector,
    ProvidersMetadataCollector,
} from '../lib';

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

class Main {
    constructor(@inject(IRepositoryKey) private repository: IRepository) {}

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
});
