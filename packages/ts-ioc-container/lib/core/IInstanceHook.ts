import { id, noop } from '../helpers/utils';
import { IDisposable } from '../helpers/types';

export interface IInstanceHook extends IDisposable {
    resolve<T>(instance: T): T;

    dispose(): void;

    clone(): IInstanceHook;
}

export const emptyHook: IInstanceHook = {
    resolve: id,
    dispose: noop,
    clone: () => emptyHook,
};
