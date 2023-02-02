import { constructor } from '../../helpers/types';
import { IProvider, ProviderKey, ResolveDependency } from './IProvider';
import { Resolveable } from '../IContainer';
import { NoRegistrationKeysProvidedError } from '../../errors/NoRegistrationKeysProvidedError';
import { IProvidersMetadataCollector } from './IProvidersMetadataCollector';

export class Provider<T> implements IProvider<T> {
    static fromClass<T>(value: constructor<T>): Provider<T> {
        return new Provider((l, ...args) => l.resolve(value, ...args));
    }

    static fromValue<T>(value: T): Provider<T> {
        return new Provider(() => value);
    }

    private key?: ProviderKey;

    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    setKey(key: ProviderKey): void {
        this.key = key;
    }

    clone(): Provider<T> {
        const provider = new Provider(this.resolveDependency);
        if (this.key) {
            provider.setKey(this.key);
        }
        return provider;
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
            throw new NoRegistrationKeysProvidedError('Pls provide registration keys for current provider');
        }
        return this.key;
    }
}

export const createAddKeysDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (key: ProviderKey): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (builder) => fn(builder).forKey(key));
    };
