import { IHook } from './IHook';

export class EmptyHook implements IHook {
    onInstanceCreate(): void {}

    onContainerRemove(): void {}

    onProviderResolved<GInstance>(instance: GInstance): GInstance {
        return instance;
    }

    clone(): IHook {
        return new EmptyHook();
    }
}
