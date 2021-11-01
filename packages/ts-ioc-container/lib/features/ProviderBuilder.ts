import { IProvider, ResolveDependency, Tag } from '../core/IProvider';
import { SingletonProvider } from './scope/SingletonProvider';
import { Provider } from '../core/Provider';
import { constructor } from '../helpers/types';
import { IServiceLocator } from '../core/IServiceLocator';
import { HookedProvider } from './instanceHook/HookedProvider';
import { IInstanceHook } from './instanceHook/IInstanceHook';
import { TaggedProvider } from './scope/TaggedProvider';
import { LevelProvider } from './scope/LevelProvider';

export class ProviderBuilder<T> {
    static fromConstructor<T>(value: constructor<T>): ProviderBuilder<T> {
        return new ProviderBuilder(Provider.fromConstructor(value));
    }

    static fromInstance<T>(value: T): ProviderBuilder<T> {
        return new ProviderBuilder(Provider.fromInstance(value));
    }

    static fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T> {
        return new ProviderBuilder(new Provider(fn));
    }

    constructor(private provider: IProvider<T>) {}

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

    forTags(tags: Tag[]): this {
        this.provider = new TaggedProvider(this.provider, tags);
        return this;
    }

    forLevel(level: number): this {
        this.provider = new LevelProvider(this.provider, [level, level]);
        return this;
    }

    asSingleton(): IProvider<T> {
        return new SingletonProvider(this.provider);
    }

    asRequested(): IProvider<T> {
        return this.provider;
    }
}
