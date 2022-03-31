import { IProvider, ResolveDependency, Tag } from '../../core/provider/IProvider';
import { SingletonProvider } from '../providers/SingletonProvider';
import { Provider } from '../../core/provider/Provider';
import { constructor } from '../../helpers/types';
import { TaggedProvider } from '../providers/TaggedProvider';
import { LevelProvider } from '../providers/LevelProvider';
import { ProviderReducer } from './IProvidersMetadataCollector';
import { ArgsFn, ArgsProvider } from '../../core/provider/ArgsProvider';
import { ProviderKey } from '../../core/IServiceLocator';
import { ContainerProvider } from './ContainerProvider';

export function fromClass<T>(value: constructor<T>): ProviderBuilder<T> {
    return new ProviderBuilder(Provider.fromClass(value));
}

export function fromValue<T>(value: T): ProviderBuilder<T> {
    return new ProviderBuilder(Provider.fromValue(value));
}

export function fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T> {
    return new ProviderBuilder(new Provider(fn));
}

export class ProviderBuilder<T> {
    private keys: ProviderKey[] = [];

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

    forKeys(...keys: ProviderKey[]): this {
        this.keys = keys;
        return this;
    }

    build(): ContainerProvider<T> {
        return new ContainerProvider(this.provider, new Set(this.keys));
    }
}
