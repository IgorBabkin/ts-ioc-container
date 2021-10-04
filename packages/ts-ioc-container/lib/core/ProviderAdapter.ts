import { IServiceLocator } from './IServiceLocator';
import { IProvider, ScopeOptions } from './IProvider';

export class ProviderAdapter<T> implements IProvider<T> {
    constructor(private provider: IProvider<T>, private filters: ScopeOptions) {}

    clone(): IProvider<T> {
        return new ProviderAdapter(this.provider.clone(), this.filters);
    }

    dispose(): void {
        this.provider.dispose();
    }

    isValid(): boolean {
        return this.provider.isValid(this.filters);
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.provider.resolve(locator, ...args);
    }
}
