import { IProvider, ResolveDependency, Tag } from './IProvider';
import { ArgsFn, ArgsProvider } from './ArgsProvider';
import { TaggedProvider } from './TaggedProvider';
import { SingletonProvider } from './SingletonProvider';
import { constructor } from '../types';
import { Provider } from './Provider';

export class ProviderBuilder {
    static fromClass(Target: constructor<unknown>): ProviderBuilder {
        return new ProviderBuilder(new Provider((container, ...args) => container.resolve(Target, ...args)));
    }

    static fromValue(value: unknown): ProviderBuilder {
        return new ProviderBuilder(new Provider(() => value));
    }

    static fromFn(fn: ResolveDependency): ProviderBuilder {
        return new ProviderBuilder(new Provider(fn));
    }

    constructor(private provider: IProvider) {}

    withArgs(...extraArgs: unknown[]): this {
        this.provider = new ArgsProvider(this.provider, () => extraArgs);
        return this;
    }

    withArgsFn(argsFn: ArgsFn): this {
        this.provider = new ArgsProvider(this.provider, argsFn);
        return this;
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

    build() {
        return this.provider;
    }
}
