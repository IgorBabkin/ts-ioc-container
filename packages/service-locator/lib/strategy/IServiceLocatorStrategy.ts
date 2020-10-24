import { constructor, IServiceLocator } from '../IServiceLocator';

export interface IServiceLocatorStrategy {
    setLocator(locator: IServiceLocator): IServiceLocator;

    resolveConstructor<T>(value: constructor<T>, ...deps: any[]): T;

    dispose(): void;
}
