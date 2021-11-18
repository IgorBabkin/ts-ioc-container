import { RegisterOptions, Resolveable } from './IServiceLocator';
import { IKeyedProvider, Tag } from './provider/IProvider';
import { IDisposable } from '../helpers/types';

export interface IDIContainer extends Resolveable, IDisposable {
    createScope(tags?: Tag[]): IDIContainer;

    register(provider: IKeyedProvider<unknown>, options?: Partial<RegisterOptions>): this;
}
