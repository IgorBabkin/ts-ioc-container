import { IProvider } from './IProvider';
import { IServiceLocator } from '../IServiceLocator';
import { ProviderNotClonedError } from '../../errors/ProviderNotClonedError';

class Box<T> {
    constructor(public value: T) {}
}

export class SingletonProvider<T> implements IProvider<T> {
    private instance: Box<T> | null = null;

    constructor(private readonly decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        throw new ProviderNotClonedError('SingletonProvider cannot be cloned');
    }

    dispose(): void {
        this.instance = null;
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        if (this.instance === null) {
            const instance = this.decorated.resolve(locator, ...args);
            this.instance = new Box<T>(instance);
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.instance!.value as T;
    }
}