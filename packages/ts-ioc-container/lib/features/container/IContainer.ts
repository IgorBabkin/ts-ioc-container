import {Resolveable} from '../../core/IServiceLocator';
import {Tag} from '../../core/provider/IProvider';
import {IDisposable} from '../../helpers/types';
import {IContainerProvider} from "./IContainerProvider";

export interface IContainer extends Resolveable, IDisposable {
    createScope(tags?: Tag[]): IContainer;

    register(fn: IContainerProvider<unknown>): this;
}
