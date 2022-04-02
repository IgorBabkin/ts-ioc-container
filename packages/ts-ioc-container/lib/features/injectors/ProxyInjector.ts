import { IInjector } from '../../core/IInjector';
import { IServiceLocator, ProviderKey } from '../../core/IServiceLocator';
import { constructor } from '../../helpers/types';

export class ProxyInjector implements IInjector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: Record<ProviderKey, unknown>[]): T {
        const args = deps.reduce((acc, it) => ({ ...acc, ...it }), {});
        return new value(
            new Proxy(locator, {
                // eslint-disable-next-line @typescript-eslint/ban-types
                get(target: IServiceLocator, prop: ProviderKey): any {
                    // eslint-disable-next-line no-prototype-builtins
                    return args.hasOwnProperty(prop) ? args[prop] : target.resolve(prop);
                },
            }),
        );
    }
}