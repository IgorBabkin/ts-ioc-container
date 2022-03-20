import { id, noop } from '../helpers/utils';

export interface IInstanceHook {
    onConstruct<T>(instance: T): T;

    onResolve<T>(instance: T): T;

    onDispose(instance: unknown): void;
}

export const emptyHook: IInstanceHook = {
    onResolve: id,
    onConstruct: id,
    onDispose: noop,
};
