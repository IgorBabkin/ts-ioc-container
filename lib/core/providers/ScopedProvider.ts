import { IProvider } from './IProvider';
import { SingletonProvider } from './SingletonProvider';
import { IServiceLocator } from '../IServiceLocator';
import { ProviderNotResolvedError } from '../../errors/ProviderNotResolvedError';

export class ScopedProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>) {}

    clone(): IProvider<T> | undefined {
        const cloned = this.decorated.clone();
        return cloned ? new SingletonProvider(cloned) : undefined;
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        throw new ProviderNotResolvedError('Cannot resolve dependency from scoped provider');
    }
}
