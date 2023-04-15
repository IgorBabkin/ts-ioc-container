import { ProviderDecorator } from './ProviderDecorator';
import { Resolveable } from '../container/IContainer';
import { IProvider } from './IProvider';

export type ArgsFn = (l: Resolveable) => unknown[];

export class ArgsProvider<T> extends ProviderDecorator<T> {
    constructor(private provider: IProvider<T>, private argsFn: ArgsFn) {
        super(provider);
    }

    resolve(container: Resolveable, ...args: unknown[]): T {
        return this.provider.resolve(container, ...this.argsFn(container), ...args);
    }

    clone(): ProviderDecorator<T> {
        return new ArgsProvider(this.provider.clone(), this.argsFn);
    }
}
