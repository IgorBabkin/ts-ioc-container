import { IResolvableHook } from './IResolvableHook';

export const emptyHook: IResolvableHook = {
    onResolve<GInstance>(instance: GInstance) {},
    onDispose<GInstance>() {},
};
