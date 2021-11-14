import { IKeyedProvider, ResolveDependency, Tag } from '../core/provider/IProvider';
import { SingletonProvider } from './scope/SingletonProvider';
import { Provider } from '../core/provider/Provider';
import { constructor } from '../helpers/types';
import { HookedProvider } from './instanceHook/HookedProvider';
import { IInstanceHook } from './instanceHook/IInstanceHook';
import { TaggedProvider } from './scope/TaggedProvider';
import { LevelProvider } from './scope/LevelProvider';
import { ProviderReducer } from './scope/IProvidersMetadataCollector';
import { ProviderKey } from '../core/IProviderRepository';
import { ArgsFn, ArgsProvider } from '../core/provider/ArgsProvider';

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
        this.provider = new ArgsProvider(this.provider, () => extraArgs);
        return this;
    }

    withHook(hook: IInstanceHook): this {
        this.provider = new HookedProvider(this.provider, hook);
        return this;
    }

    withArgsFn(argsFn: ArgsFn): this {
        this.provider = new ArgsProvider(this.provider, argsFn);
        return this;
    }

    withReducer(reducer: ProviderReducer<T>): this {
        this.provider = reducer(this.provider);
        return this;
    }

    forTags(...tags: Tag[]): this {
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

    forKeys(...keys: ProviderKey[]): this {
        this.provider = this.provider.addKeys(...keys);
        return this;
    }

    build(): IKeyedProvider<T> {
        return this.provider;
    }
}
