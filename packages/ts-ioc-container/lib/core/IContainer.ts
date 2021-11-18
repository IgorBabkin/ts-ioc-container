import { RegisterOptions, Resolveable } from './IServiceLocator';
import { IKeyedProvider, Tag } from './provider/IProvider';
import { IDisposable } from '../helpers/types';

export interface IContainer extends Resolveable, IDisposable {
    createScope(tags?: Tag[]): IContainer;

    register(fn: IKeyedProvider<unknown>, options?: Partial<RegisterOptions>): this;
}
