import { IInstanceHook } from './instanceHook/IInstanceHook';
import { IMockProviderStorage } from './mock/IMockProviderStorage';
import { IServiceLocator } from '../core/IServiceLocator';

export interface ILocatorBuilder {
    withInjectorHook(hook: IInstanceHook): this;

    withMockedRepository(mockedProviderStorage: IMockProviderStorage): this;

    build(): IServiceLocator;
}
