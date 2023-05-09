import { ProviderDecorator } from './ProviderDecorator';
import { Resolvable } from '../container/IContainer';
import { IProvider } from './IProvider';

export type ArgsFn = (l: Resolvable) => unknown[];

export class ArgsProvider<T> extends ProviderDecorator<T> {
    constructor(private provider: IProvider<T>, private argsFn: ArgsFn) {
        super(provider);
    }

    resolve(container: Resolvable, ...args: unknown[]): T {
        return this.provider.resolve(container, ...this.argsFn(container), ...args);
    }

    clone(): ProviderDecorator<T> {
        return new ArgsProvider(this.provider.clone(), this.argsFn);
    }
}
