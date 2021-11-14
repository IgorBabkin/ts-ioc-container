import { Resolveable } from '../IServiceLocator';
import { IKeyedProvider, ScopeOptions } from './IProvider';
import { ProviderKey } from '../IProviderRepository';

export abstract class ProviderDecorator<T> implements IKeyedProvider<T> {
    constructor(private decorated: IKeyedProvider<T>) {}

    abstract clone(): ProviderDecorator<T>;

    dispose(): void {
        this.decorated.dispose();
    }

    isValid(filters: ScopeOptions): boolean {
        return this.decorated.isValid(filters);
    }

    resolve(locator: Resolveable, ...args: any[]): T {
        return this.decorated.resolve(locator, ...args);
    }

    addKeys(...keys: ProviderKey[]): this {
        this.decorated.addKeys(...keys);
        return this;
    }

    getKeys(): ProviderKey[] {
        return this.decorated.getKeys();
    }
}
