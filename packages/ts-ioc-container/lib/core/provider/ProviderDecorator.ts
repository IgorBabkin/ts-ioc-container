import { Resolveable } from '../container/IContainer';
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

    resolve(container: Resolveable, ...args: any[]): T {
        return this.decorated.resolve(container, ...args);
    }

    getKeyOrFail(): ProviderKey {
        return this.decorated.getKeyOrFail();
    }

    setKey(key: ProviderKey): this {
        this.decorated.setKey(key);
        return this;
    }
}
