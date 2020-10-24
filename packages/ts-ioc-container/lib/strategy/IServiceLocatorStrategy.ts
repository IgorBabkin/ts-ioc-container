import { constructor } from '../IServiceLocator';

export interface IServiceLocatorStrategy {
    resolveConstructor<T>(value: constructor<T>, ...deps: any[]): T;

    dispose(): void;
}
