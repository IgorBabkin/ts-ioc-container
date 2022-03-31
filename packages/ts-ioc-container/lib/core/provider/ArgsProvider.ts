import {ProviderDecorator} from './ProviderDecorator';
import {Resolveable} from '../IServiceLocator';
import {IProvider} from "./IProvider";

export type ArgsFn = (l: Resolveable) => any[];

export class ArgsProvider<T> extends ProviderDecorator<T> {
    constructor(private provider: IProvider<T>, private argsFn: ArgsFn) {
        super(provider);
    }

    resolve(locator: Resolveable, ...args: any[]): T {
        return this.provider.resolve(locator, ...args, ...this.argsFn(locator));
    }

    clone(): ProviderDecorator<T> {
        return new ArgsProvider(this.provider.clone(), this.argsFn);
    }
}
