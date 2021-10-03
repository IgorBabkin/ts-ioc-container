import { IProvider } from './IProvider';
import { ProviderMismatchNameError } from '../../errors/ProviderMismatchNameError';
import { IServiceLocator } from '../IServiceLocator';

export class NamedProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>, private locatorName: string) {}

    clone(): IProvider<T> {
        return new NamedProvider(this.decorated.clone(), this.locatorName);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        if (locator.name !== this.locatorName) {
            throw new ProviderMismatchNameError(this.locatorName, locator.name);
        }
        return this.decorated.resolve(locator, ...args);
    }
}
