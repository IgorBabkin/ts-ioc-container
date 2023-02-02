import { IInjector } from '../../core/IInjector';
import { IContainer } from '../../core/container/IContainer';
import { constructor } from '../../core/utils/types';
import { ProviderKey } from '../../core/provider/IProvider';

export class ProxyInjector implements IInjector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: Record<ProviderKey, unknown>[]): T {
        const args = deps.reduce((acc, it) => ({ ...acc, ...it }), {});
        return new value(
            new Proxy(container, {
                // eslint-disable-next-line @typescript-eslint/ban-types
                get(target: IContainer, prop: ProviderKey): any {
                    // eslint-disable-next-line no-prototype-builtins
                    return args.hasOwnProperty(prop) ? args[prop] : target.resolve(prop);
                },
            }),
        );
    }
}
