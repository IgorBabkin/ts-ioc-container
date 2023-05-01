import { IProvider, ProviderKey, Tag } from '../provider/IProvider';
import { SingletonProvider } from '../provider/SingletonProvider';
import { TaggedProvider } from '../provider/TaggedProvider';
import { ArgsFn, ArgsProvider } from '../provider/ArgsProvider';
import { RegistrationMissingKeyError } from './RegistrationMissingKeyError';
import { MapFn } from '../types';
import { Registration } from './Registration';

export class RegistrationBuilder<T = unknown> {
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

    map(reducer: MapFn<RegistrationBuilder<T>>): RegistrationBuilder<T> {
        return reducer(this);
    }

    perTags(...tags: Tag[]): this {
        this.provider = new TaggedProvider(this.provider, tags);
        return this;
    }

    asSingleton(...tags: Tag[]): this {
        this.provider = new SingletonProvider(this.provider);
        if (tags.length > 0) {
            this.provider = new TaggedProvider(this.provider, tags);
        }
        return this;
    }

    forKey(key: ProviderKey): this {
        this.key = key;
        return this;
    }

    build(): Registration<T> {
        if (!this.key) {
            throw new RegistrationMissingKeyError('Pls provide registration keys for current provider');
        }
        return { key: this.key, provider: this.provider };
    }
}
