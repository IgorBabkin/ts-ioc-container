import { IServiceLocator } from '../../core/IServiceLocator';
import { ProviderNotClonedError } from '../../errors/ProviderNotClonedError';
import { IProvider } from '../../core/IProvider';
import { Box } from '../../helpers/Box';

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
