import { Resolvable } from '../container/IContainer';
import { ProviderDecorator } from './ProviderDecorator';
import { IProvider } from './IProvider';
import { MapFn } from '../utils';

type Boxed<T> = { value: T };

export function singleton(): MapFn<IProvider> {
    return (provider) => new SingletonProvider(provider);
}

export class SingletonProvider<T> extends ProviderDecorator<T> {
    private instance: Boxed<T> | null = null;

    constructor(private readonly provider: IProvider<T>) {
        super(provider);
    }

    clone(): SingletonProvider<T> {
        return new SingletonProvider(this.provider.clone());
    }

    resolve(container: Resolvable, ...args: unknown[]): T {
        if (this.instance === null) {
            const instance = this.provider.resolve(container, ...args);
            this.instance = { value: instance };
        }

        return this.instance?.value as T;
    }
}
