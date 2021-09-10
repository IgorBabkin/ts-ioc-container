import { IProvider } from './IProvider';
import { SingletonProvider } from './SingletonProvider';
import { IServiceLocator } from '../IServiceLocator';
import { DependencyCannotBeResolvedError } from '../../errors/DependencyCannotBeResolvedError';

export class ScopedProvider<T> implements IProvider<T> {
    constructor(private readonly decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        return new SingletonProvider(this.decorated.clone());
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        throw new DependencyCannotBeResolvedError('Dependency cannot be resolved from ScopedProvider');
    }
}
