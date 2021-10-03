import { IProvider } from '../../core/IProvider';
import { SingletonProvider } from './singleton/SingletonProvider';
import { IServiceLocator } from '../../core/IServiceLocator';
import { MethodNotImplementedError } from '../../errors/MethodNotImplementedError';
import { SingletonProviderStrategy } from './singleton/SingletonProviderStrategy';

export class ScopedProvider<T> implements IProvider<T> {
    constructor(private readonly decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        return new SingletonProvider(this.decorated.clone(), new SingletonProviderStrategy());
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        throw new MethodNotImplementedError('Dependency cannot be resolved from ScopedProvider');
    }
}
