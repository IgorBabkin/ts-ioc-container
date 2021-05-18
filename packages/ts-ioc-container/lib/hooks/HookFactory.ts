import { IHook } from './IHook';
import { IHookFactory } from './IHookFactory';
import { IInstanceHook } from './IInstanceHook';
import { Hook } from './Hook';

export class HookFactory implements IHookFactory {
    constructor(private hooks?: IInstanceHook[]) {}

    create(): IHook {
        return new Hook(this.hooks);
    }
}
