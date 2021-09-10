import { IProvider } from './IProvider';
import { SingletonProvider } from './SingletonProvider';
import { IServiceLocator } from '../IServiceLocator';
import { ProviderCannotBeResolvedError } from '../../errors/ProviderCannotBeResolvedError';

export class ScopedProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        return new SingletonProvider(this.decorated.clone());
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        throw new ProviderCannotBeResolvedError('Cannot resolve dependency from scoped provider');
    }
}
