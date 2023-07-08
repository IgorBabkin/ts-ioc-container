import { constructor } from '../utils';
import { IContainer } from '../container/IContainer';

export interface IInjector {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T;
}
