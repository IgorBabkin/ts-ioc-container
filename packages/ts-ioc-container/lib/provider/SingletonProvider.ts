import { Resolvable } from '../container/IContainer';
import { ProviderDecorator } from './ProviderDecorator';
import { IProvider } from './IProvider';

type Boxed<T> = { value: T };

export class SingletonProvider<T> extends ProviderDecorator<T> {
    private instance: Boxed<T> | null = null;

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

    resolve(container: Resolvable, ...args: unknown[]): T {
        if (this.instance === null) {
            const instance = this.provider.resolve(container, ...args);
            this.instance = { value: instance };
        }

        return this.instance?.value as T;
    }
}
