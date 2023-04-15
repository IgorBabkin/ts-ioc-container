import { IProvider, ProviderKey, Tag } from '../core/provider/IProvider';
import { SingletonProvider } from './SingletonProvider';
import { TaggedProvider } from './TaggedProvider';
import { ProviderReducer } from '../core/provider/IProviderReflector';
import { ArgsFn, ArgsProvider } from './ArgsProvider';
import { Provider } from '../core/provider/Provider';
import { constructor } from '../core/utils/types';
import { providerReflector } from '../core/provider/ProviderReflector';
import { Registration } from '../core/container/IContainer';
import { ProviderHasNoKeyError } from '../core/provider/ProviderHasNoKeyError';

export class ProviderBuilder<T> {
    static fromClass<T>(value: constructor<T>): ProviderBuilder<T> {
        return new ProviderBuilder(Provider.fromClass(value)).map(providerReflector.findReducerOrCreate(value));
    }

    static fromValue<T>(value: T): ProviderBuilder<T> {
        return new ProviderBuilder(Provider.fromValue(value));
    }

    static fromFn<T>(fn: (...args: any[]) => T): ProviderBuilder<T> {
        return new ProviderBuilder(new Provider(fn));
    }

    private key?: ProviderKey;

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

    perTags(...tags: Tag[]): this {
        this.provider = new TaggedProvider(this.provider, tags);
        return this;
    }

    asSingleton(): this {
        this.provider = new SingletonProvider(this.provider);
        return this;
    }

    forKey(key: ProviderKey): this {
        this.key = key;
        return this;
    }

    build(): Registration<T> {
        if (!this.key) {
            throw new ProviderHasNoKeyError('Pls provide registration keys for current provider');
        }
        return { key: this.key, provider: this.provider };
    }
}
