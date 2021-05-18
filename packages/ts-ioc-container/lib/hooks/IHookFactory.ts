import { IHook } from './IHook';

export interface IHookFactory {
    create(): IHook;
}
