export interface IHook {
    onContainerRemove(): void;

    onInstanceCreate<GInstance>(instance: GInstance): void;

    dispose(): void;

    clone(): IHook;
}
