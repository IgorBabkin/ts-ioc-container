export interface IInstanceHook<GInstance = any> {
    onCreate?(instance: GInstance): void;
    onDispose?(instance: GInstance): void;
}
