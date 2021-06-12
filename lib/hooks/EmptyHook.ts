import { IHook } from './IHook';

export class EmptyHook implements IHook {
    onInstanceCreate(): void {}

    onContainerRemove(): void {}

    onDependencyNotFound<GInstance>(): GInstance | undefined {
        return undefined;
    }

    clone(): IHook {
        return new EmptyHook();
    }
}
