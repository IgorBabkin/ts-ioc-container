import { IInstanceHook } from './IInstanceHook';

export const emptyHook: IInstanceHook = {
    onConstruct<GInstance>(instance: GInstance) {},
    onDispose<GInstance>(instance: GInstance) {},
};
