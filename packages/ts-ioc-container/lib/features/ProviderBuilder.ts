import { IProvider, ResolveDependency } from '../core/IProvider';
import { SingletonProvider } from './scope/SingletonProvider';
import { Provider } from '../core/Provider';
import { constructor } from '../helpers/types';
import { IServiceLocator } from '../core/IServiceLocator';
import { HookedProvider } from './instanceHook/HookedProvider';
import { IInstanceHook } from './instanceHook/IInstanceHook';
import { TaggedProvider } from './scope/TaggedProvider';
import { LevelProvider } from './scope/LevelProvider';
import { RangeType } from '../helpers/RangeType';
import { MathSet } from '../helpers/MathSet';

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
        this.provider = new SingletonProvider(this.provider);
        return this;
    }

    forTags(tags: string[]): this {
        this.provider = new TaggedProvider(this.provider, MathSet.fromArray(tags));
        return this;
    }

    forLevel(level: number): this {
        this.provider = new LevelProvider(this.provider, RangeType.fromSingleValue(level));
        return this;
    }

    build(): IProvider<T> {
        return this.provider;
    }
}
