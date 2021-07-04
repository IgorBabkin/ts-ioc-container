import { IProvider } from './IProvider';
import { SingletonProvider } from './SingletonProvider';
import { IServiceLocator } from '../IServiceLocator';
import { CannotResolveFromScopedProviderError } from '../../errors/CannotResolveFromScopedProviderError';

export class ScopedProvider<T> implements IProvider<T> {
    canBeCloned = true;

    constructor(private decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        return new SingletonProvider(this.decorated.clone());
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        throw new CannotResolveFromScopedProviderError();
    }
}
