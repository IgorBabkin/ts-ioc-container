import { constructor } from '../helpers/types';
import { IKeyedProvider, ProviderKey, ResolveDependency, ScopeOptions } from './IProvider';
import { IServiceLocator } from './IServiceLocator';

export class Provider<T> implements IKeyedProvider<T> {
    static fromClass<T>(value: constructor<T>): Provider<T> {
        return new Provider((l, ...args) => l.resolve(value, ...args));
    }

    static fromValue<T>(value: T): Provider<T> {
        return new Provider(() => value);
    }

    private keys: ProviderKey[] = [];

    constructor(private readonly resolveDependency: ResolveDependency<T>) {}

    clone(): IKeyedProvider<T> {
        return new Provider(this.resolveDependency);
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.resolveDependency(locator, ...args);
    }

    dispose(): void {}

    isValid(filters: ScopeOptions): boolean {
        return true;
    }

    addKeys(...keys: ProviderKey[]): this {
        this.keys.push(...keys);
        return this;
    }

    getKeys(): ProviderKey[] {
        return this.keys;
    }
}
