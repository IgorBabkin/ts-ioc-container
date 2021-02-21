export interface IInstanceHook<GInstance = any> {
    onCreateInstance(instance: GInstance): void;
}
