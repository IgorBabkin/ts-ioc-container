import { constructor } from '../helpers/types';

export interface IServiceLocatorStrategy {
    resolveConstructor<T>(value: constructor<T>, ...deps: any[]): T;

    dispose(): void;
}
