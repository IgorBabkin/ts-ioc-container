import { constructor } from './utils/types';
import { IContainer } from './container/IContainer';

export interface IInjector {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: any[]): T;
}
