import { ProviderDecorator } from '../../core/provider/ProviderDecorator';
import { Resolveable } from '../../core/IContainer';
import { IProvider } from '../../core/provider/IProvider';
import { IProvidersMetadataCollector } from '../../core/provider/IProvidersMetadataCollector';
import { constructor } from '../../helpers/types';

export type ArgsFn = (l: Resolveable) => any[];

export class ArgsProvider<T> extends ProviderDecorator<T> {
    constructor(private provider: IProvider<T>, private argsFn: ArgsFn) {
        super(provider);
    }

    resolve(locator: Resolveable, ...args: any[]): T {
        return this.provider.resolve(locator, ...this.argsFn(locator), ...args);
    }

    clone(): ProviderDecorator<T> {
        return new ArgsProvider(this.provider.clone(), this.argsFn);
    }
}

export const createArgsFnDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (argsFn: ArgsFn): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (builder) => fn(builder).withArgsFn(argsFn));
    };
