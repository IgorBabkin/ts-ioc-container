import { constructor } from '../helpers/types';
import { IContainer } from './IContainer';

export interface IInjector {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: any[]): T;
}
