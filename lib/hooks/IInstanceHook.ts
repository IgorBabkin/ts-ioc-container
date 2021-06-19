export interface IInstanceHook {
    onConstruct<GInstance>(instance: GInstance): void;

    onDispose<GInstance>(instance: GInstance): void;
}
