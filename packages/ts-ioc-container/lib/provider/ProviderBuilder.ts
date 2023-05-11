import { IProvider, ResolveDependency, Tag } from './IProvider';
import { ArgsFn, ArgsProvider } from './ArgsProvider';
import { TaggedProvider } from './TaggedProvider';
import { SingletonProvider } from './SingletonProvider';
import { constructor, identity } from '../utils';
import { Provider } from './Provider';
import { MapperReflector } from '../MapperReflector';

const reflector = new MapperReflector<ProviderBuilder>('provider');

export class ProviderBuilder {
    static fromClass(Target: constructor<unknown>): ProviderBuilder {
        const map = reflector.getMapper(Target) ?? identity;
        return map(new ProviderBuilder(new Provider((container, ...args) => container.resolve(Target, ...args))));
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

export const perTags =
    (...tags: Tag[]): ClassDecorator =>
    (target: any) => {
        reflector.appendMapper(target, (builder) => builder.perTags(...tags));
    };

export const asSingleton =
    (...tags: Tag[]): ClassDecorator =>
    (target: any) => {
        reflector.appendMapper(target, (builder) => builder.asSingleton(...tags));
    };
