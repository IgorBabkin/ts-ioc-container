import { constructor } from '../utils/types';
import { IProvider, ProviderKey, ResolveDependency } from './IProvider';
import { Resolveable } from '../container/IContainer';
import { ProviderHasNoKeyError } from './ProviderHasNoKeyError';
import { providerReflector } from './ProviderReflector';

export class Provider<T> implements IProvider<T> {
    static fromClass<T>(value: constructor<T>): Provider<T> {
        return new Provider((l, ...args) => l.resolve(value, ...args));
    }

    static fromValue<T>(value: T): Provider<T> {
        return new Provider(() => value);
    }

    private key?: ProviderKey;

    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    clone(): Provider<T> {
        return new Provider(this.resolveDependency);
    }

    resolve(container: Resolveable, ...args: any[]): T {
        return this.resolveDependency(container, ...args);
    }

    dispose(): void {}

    isValid(): boolean {
        return true;
    }

    getKeyOrFail(): ProviderKey {
        if (!this.key) {
            throw new ProviderHasNoKeyError('Pls provide registration keys for current provider');
        }
        return this.key;
    }
}

export const forKey =
    (key: ProviderKey): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = providerReflector.findReducerOrCreate(targetClass);
        providerReflector.addReducer(targetClass, (builder) => fn(builder).forKey(key));
    };
