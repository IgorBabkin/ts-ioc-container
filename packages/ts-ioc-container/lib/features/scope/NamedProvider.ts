import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';
import { ProviderNotClonedError } from '../../errors/ProviderNotClonedError';
import { ProviderMismatchNameError } from '../../errors/ProviderMismatchNameError';

export class NamedProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>, private scopeName: string) {}

    clone(options: ScopeOptions): IProvider<T> {
        if (this.scopeName !== options.name) {
            throw new ProviderNotClonedError(`Expected scope name ${this.scopeName}. Actual: ${options.name}`);
        }
        return new NamedProvider(this.decorated.clone(options), this.scopeName);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        if (locator.name !== this.scopeName) {
            throw new ProviderMismatchNameError(this.scopeName, locator.name);
        }
        return this.decorated.resolve(locator, ...args);
    }
}
