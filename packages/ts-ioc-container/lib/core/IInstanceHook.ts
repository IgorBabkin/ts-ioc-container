export interface IInstanceHook {
    onConstruct(instance: unknown): void;

    onDispose(instance: unknown): void;
}

export const emptyHook: IInstanceHook = {
    onConstruct(instance: unknown): void {},
    onDispose(instance: unknown): void {},
};
