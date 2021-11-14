import { IKeyedProvider, ProviderKey, ResolveDependency, Tag } from '../core/IProvider';
import { SingletonProvider } from './scope/SingletonProvider';
import { Provider } from '../core/Provider';
import { constructor } from '../helpers/types';
import { IServiceLocator } from '../core/IServiceLocator';
import { HookedProvider } from './instanceHook/HookedProvider';
import { IInstanceHook } from './instanceHook/IInstanceHook';
import { TaggedProvider } from './scope/TaggedProvider';
import { LevelProvider } from './scope/LevelProvider';
import { ProviderReducer } from './scope/IProvidersMetadataCollector';

export class ProviderBuilder<T> {
    static fromClass<T>(value: constructor<T>): ProviderBuilder<T> {
        return new ProviderBuilder(Provider.fromClass(value));
    }

    static fromValue<T>(value: T): ProviderBuilder<T> {
        return new ProviderBuilder(Provider.fromValue(value));
    }

    static fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T> {
        return new ProviderBuilder(new Provider(fn));
    }

    constructor(private provider: IKeyedProvider<T>) {}

    withArgs(...extraArgs: any[]): this {
        const oldProvider = this.provider;
        this.provider = new Provider((l, ...args) => oldProvider.resolve(l, ...args, ...extraArgs));
        return this;
    }

    withHook(hook: IInstanceHook): this {
        this.provider = new HookedProvider(this.provider, hook);
        return this;
    }

    withArgsFn(argsFn: (l: IServiceLocator) => any[]): this {
        const oldProvider = this.provider;
        this.provider = new Provider((l, ...args) => oldProvider.resolve(l, ...args, ...argsFn(l)));
        return this;
    }

    withReducer(reducer: ProviderReducer<T>): this {
        this.provider = reducer(this.provider);
        return this;
    }

    forTags(tags: Tag[]): this {
        this.provider = new TaggedProvider(this.provider, tags);
        return this;
    }

    forLevel(level: number): this {
        this.provider = new LevelProvider(this.provider, [level, level]);
        return this;
    }

    asSingleton(): this {
        this.provider = new SingletonProvider(this.provider);
        return this;
    }

    build(...keys: ProviderKey[]): IKeyedProvider<T> {
        return this.provider.addKeys(...keys);
    }
}
