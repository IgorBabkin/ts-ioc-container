import { id, noop } from '../utils/others';
import { Disposable } from '../utils/types';

export interface IContainerHook extends Disposable {
    resolve<T>(instance: T): T;

    clone(): IContainerHook;
}

export const emptyHook: IContainerHook = {
    resolve: id,
    dispose: noop,
    clone: () => emptyHook,
};
