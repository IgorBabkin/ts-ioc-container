import { InjectionToken } from './strategy/ioc/decorators';
import { IProvider, ProviderKey } from './provider/IProvider';

export interface IServiceLocator {
    createContainer(): IServiceLocator;

    remove(): void;

    resolve<T>(c: InjectionToken<T>, ...deps: any[]): T;

    register<T>(key: ProviderKey, registration: IProvider<T>): this;
}
