import { Resolveable } from '../IContainer';
import { IProvider, ProviderKey, ScopeOptions } from './IProvider';

export abstract class ProviderDecorator<T> implements IProvider<T> {
    protected constructor(private decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        return this.decorated.clone();
    }

    dispose(): void {
        this.decorated.dispose();
    }

    isValid(filters: ScopeOptions): boolean {
        return this.decorated.isValid(filters);
    }

    resolve(locator: Resolveable, ...args: any[]): T {
        return this.decorated.resolve(locator, ...args);
    }

    getKeyOrFail(): ProviderKey {
        return this.decorated.getKeyOrFail();
    }

    setKey(key: ProviderKey): void {
        this.decorated.setKey(key);
    }
}
