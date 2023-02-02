import { IProvider, ProviderKey, ResolveDependency, Tag } from '../../core/provider/IProvider';
import { SingletonProvider } from './SingletonProvider';
import { Provider } from '../../core/provider/Provider';
import { constructor } from '../../helpers/types';
import { TaggedProvider } from './TaggedProvider';
import { LevelProvider } from './LevelProvider';
import { ProviderReducer } from '../../core/provider/IProvidersMetadataCollector';
import { ArgsFn, ArgsProvider } from './ArgsProvider';

export function fromClass<T>(value: constructor<T>): ProviderBuilder<T> {
    return new ProviderBuilder(Provider.fromClass(value));
}

export function fromValue<T>(value: T): ProviderBuilder<T> {
    return new ProviderBuilder(Provider.fromValue(value));
}

export function fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T> {
    return new ProviderBuilder(new Provider(fn));
}

export function fromClassArray<T>(classes: constructor<T>[]): ProviderBuilder<T[]> {
    return fromFn((l) => classes.map((it) => l.resolve(it)));
}

export class ProviderBuilder<T> {
    constructor(private provider: IProvider<T>) {}

    withArgs(...extraArgs: any[]): this {
        this.provider = new ArgsProvider(this.provider, () => extraArgs);
        return this;
    }

    withArgsFn(argsFn: ArgsFn): this {
        this.provider = new ArgsProvider(this.provider, argsFn);
        return this;
    }

    map(reducer: ProviderReducer<T>): ProviderBuilder<T> {
        return reducer(this);
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

    forKey(key: ProviderKey): this {
        this.provider.setKey(key);
        return this;
    }

    build(): IProvider<T> {
        return this.provider;
    }
}
