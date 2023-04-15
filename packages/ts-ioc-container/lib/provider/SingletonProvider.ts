import { Resolveable } from '../container/IContainer';
import { Box } from '../utils/types';
import { ProviderDecorator } from './ProviderDecorator';
import { IProvider } from './IProvider';

export class SingletonProvider<T> extends ProviderDecorator<T> {
    private instance: Box<T> | null = null;

    constructor(private readonly provider: IProvider<T>) {
        super(provider);
    }

    clone(): SingletonProvider<T> {
        return new SingletonProvider(this.provider.clone());
    }

    dispose(): void {
        this.instance = null;
        this.provider.dispose();
    }

    resolve(container: Resolveable, ...args: unknown[]): T {
        if (this.instance === null) {
            const instance = this.provider.resolve(container, ...args);
            this.instance = new Box<T>(instance);
        }

        return this.instance.value as T;
    }
}
