import { constructor } from '../helpers/types';
import { IServiceLocator } from '../IServiceLocator';

export interface IServiceLocatorStrategy {
    resolveConstructor<T>(value: constructor<T>, ...deps: any[]): T;

    dispose(): void;

    bindTo(serviceLocator: IServiceLocator): void;

    clone(): IServiceLocatorStrategy;
}
