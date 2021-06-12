import { constructor } from '../helpers/types';

export interface IInjector {
    resolve<T>(value: constructor<T>, ...deps: any[]): T;
}
