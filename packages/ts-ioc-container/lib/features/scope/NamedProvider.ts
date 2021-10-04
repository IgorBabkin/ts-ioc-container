import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';

export class NamedProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>, private scopeName: string) {}

    clone(): IProvider<T> {
        return new NamedProvider(this.decorated.clone(), this.scopeName);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.decorated.resolve(locator, ...args);
    }

    isValid(filters: ScopeOptions): boolean {
        return this.scopeName === filters.name && this.decorated.isValid(filters);
    }
}
