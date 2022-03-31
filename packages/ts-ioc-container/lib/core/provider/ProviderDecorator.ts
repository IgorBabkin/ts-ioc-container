import { Resolveable } from '../IServiceLocator';
import { IProvider, ScopeOptions } from './IProvider';

export abstract class ProviderDecorator<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>) {}

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
}
