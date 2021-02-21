import { InjectionToken } from './strategy/ioc/decorators';
import { IProvider, ProviderKey } from './IProvider';

export interface IServiceLocator<GContext = any> {
    readonly context?: GContext;

    createContainer<GChildContext>(context?: GChildContext): IServiceLocator<GChildContext>;

    remove(): void;

    resolve<T>(c: InjectionToken<T>, ...deps: any[]): T;

    register<T>(key: ProviderKey, registration: IProvider<T>): this;
}
