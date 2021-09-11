import { constructor } from '../helpers/types';
import { IDisposable } from '../helpers/IDisposable';

export interface IInjector extends IDisposable {
    resolve<T>(value: constructor<T>, ...deps: any[]): T;
}
