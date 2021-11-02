import { IInjector } from '../../core/IInjector';
import { IServiceLocator } from '../../core/IServiceLocator';
import { constructor } from '../../helpers/types';

export class ProxyInjector implements IInjector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: {}[]): T {
        const args = deps.reduce((acc, it) => ({ ...acc, ...it }), {});
        const proxy = new Proxy(
            {},
            {
                // eslint-disable-next-line @typescript-eslint/ban-types
                get(target: {}, prop: string | symbol): any {
                    // eslint-disable-next-line no-prototype-builtins
                    return args.hasOwnProperty(prop) ? args[prop] : locator.resolve(prop);
                },
            },
        );
        return new value(proxy);
    }

    clone(): IInjector {
        return new ProxyInjector();
    }

    dispose(): void {}
}
