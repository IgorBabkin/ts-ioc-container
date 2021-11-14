import { ProviderDecorator } from './ProviderDecorator';
import { IKeyedProvider } from './IProvider';
import { Resolveable } from '../IServiceLocator';

export type ArgsFn = (l: Resolveable) => any[];

export class ArgsProvider<T> extends ProviderDecorator<T> {
    constructor(private provider: IKeyedProvider<T>, private argsFn: ArgsFn) {
        super(provider);
    }

    resolve(locator: Resolveable, ...args: any[]): T {
        return this.provider.resolve(locator, ...args, ...this.argsFn(locator));
    }

    clone(): ProviderDecorator<T> {
        return new ArgsProvider(this.provider.clone(), this.argsFn);
    }
}
