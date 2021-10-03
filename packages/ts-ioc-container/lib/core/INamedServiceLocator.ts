import { IServiceLocator } from './IServiceLocator';

export interface INamedServiceLocator extends IServiceLocator {
    name?: string;
    createLocator(name?: string): INamedServiceLocator;
}
