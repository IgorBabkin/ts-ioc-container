import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../core/IServiceLocator';
import { IInjector } from '../../core/IInjector';
import { inject as injectFn, InjectionDecorator, resolve } from 'ts-constructor-injector';

export class IocInjector implements IInjector {
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: unknown[]): T {
        return resolve(locator)(value, ...deps);
    }
}

export const inject: InjectionDecorator<IServiceLocator> = injectFn;
