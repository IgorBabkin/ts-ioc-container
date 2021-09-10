import { IProvider } from './IProvider';
import { IServiceLocator } from '../IServiceLocator';
import { ProviderCannotBeClonedError } from '../../errors/ProviderCannotBeClonedError';

export class SingletonProvider<T> implements IProvider<T> {
    private instance: T | null = null;
    private hasInstance = false;

    constructor(private decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        throw new ProviderCannotBeClonedError();
    }

    dispose(): void {
        this.instance = null;
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        if (!this.hasInstance) {
            this.hasInstance = true;
            this.instance = this.decorated.resolve(locator, ...args);
        }

        return this.instance as T;
    }
}
