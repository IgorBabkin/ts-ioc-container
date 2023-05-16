import { Resolvable } from '../container/IContainer';
import { ProviderDecorator } from './ProviderDecorator';
import { IProvider } from './IProvider';
import { MapFn } from '../utils';

class Boxed<T> {
    constructor(public value: T) {}
}

export function asSingleton(): MapFn<IProvider> {
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
            this.instance = new Boxed(this.provider.resolve(container, ...args));
        }

        return this.instance?.value as T;
    }
}
