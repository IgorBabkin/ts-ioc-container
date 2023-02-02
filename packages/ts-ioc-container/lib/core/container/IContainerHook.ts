import { id, noop } from '../utils/others';
import { IDisposable } from '../utils/types';

export interface IContainerHook extends IDisposable {
    resolve<T>(instance: T): T;

    clone(): IContainerHook;
}

export const emptyHook: IContainerHook = {
    resolve: id,
    dispose: noop,
    clone: () => emptyHook,
};
