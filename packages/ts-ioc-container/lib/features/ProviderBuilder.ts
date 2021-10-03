import { IProvider, ResolveDependency } from '../core/IProvider';
import { SingletonProvider } from './scope/singleton/SingletonProvider';
import { ScopedProvider } from './scope/ScopedProvider';
import { Provider } from '../core/Provider';
import { constructor } from '../helpers/types';
import { IServiceLocator } from '../core/IServiceLocator';
import { HookedProvider } from './instanceHook/HookedProvider';
import { IInstanceHook } from './instanceHook/IInstanceHook';
import { NamedProvider } from './scope/NamedProvider';
import { LevelProvider } from './scope/LevelProvider';
import { RangeType } from '../helpers/RangeType';
import { SingletonProviderStrategy } from './scope/singleton/SingletonProviderStrategy';
import { SingletonForEveryScopeProviderStrategy } from './scope/singleton/SingletonForEveryScopeProviderStrategy';

export class ProviderBuilder<T> {
    private provider: IProvider<T>;

    static fromConstructor<T>(value: constructor<T>): ProviderBuilder<T> {
        return new ProviderBuilder((l, ...args) => l.resolve(value, ...args));
    }

    static fromInstance<T>(value: T): ProviderBuilder<T> {
        return new ProviderBuilder(() => value);
    }

    constructor(fn: ResolveDependency<T>) {
        this.provider = new Provider(fn);
    }

    withArgs(...extraArgs: any[]): this {
        this.withArgsFn(() => extraArgs);
        return this;
    }

    withHook(hook: IInstanceHook): this {
        this.provider = new HookedProvider(this.provider, hook);
        return this;
    }

    withArgsFn(fn: (l: IServiceLocator) => any[]): this {
        const oldProvider = this.provider;
        this.provider = new Provider((l, ...args) => oldProvider.resolve(l, ...args, ...fn(l)));
        return this;
    }

    asSingleton(): this {
        this.provider = new SingletonProvider(this.provider, new SingletonProviderStrategy());
        return this;
    }

    asScoped(): this {
        this.provider = new ScopedProvider(this.provider);
        return this;
    }

    asSingletonForEveryScope(): this {
        this.provider = new SingletonProvider(this.provider, new SingletonForEveryScopeProviderStrategy());
        return this;
    }

    forScopeName(name: string): this {
        this.provider = new NamedProvider(this.provider, name);
        return this;
    }

    forScopeRange(from: number, to = Infinity): this {
        this.provider = new LevelProvider(this.provider, new RangeType([from, to]));
        return this;
    }

    build(): IProvider<T> {
        return this.provider;
    }
}
