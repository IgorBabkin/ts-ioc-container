import { IProvider, ResolveDependency } from './IProvider';
import { ArgsFn, ArgsProvider } from './ArgsProvider';
import { TaggedProvider } from './TaggedProvider';
import { SingletonProvider } from './SingletonProvider';
import { constructor, MapFn } from '../utils';
import { Provider } from './Provider';
import { reduceProp, getProp } from '../reflection';
import { Tag } from '../container/IContainer';

export const perTags = (...tags: Tag[]): ClassDecorator =>
    reduceProp<MapFn<ProviderBuilder>>(
        'provider',
        (prev) => (builder) => prev(builder).perTags(...tags),
        (x) => x,
    );

export const asSingleton = (...tags: Tag[]): ClassDecorator =>
    reduceProp<MapFn<ProviderBuilder>>(
        'provider',
        (prev) => (builder) => prev(builder).asSingleton(...tags),
        (x) => x,
    );

export class ProviderBuilder {
    static fromClass(Target: constructor<unknown>): ProviderBuilder {
        const map: MapFn<ProviderBuilder> = getProp(Target, 'provider') ?? ((x) => x);
        return map(new ProviderBuilder(Provider.fromClass(Target)));
    }

    static fromValue(value: unknown): ProviderBuilder {
        return new ProviderBuilder(Provider.fromValue(value));
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
