export interface IResolvableHook {
    onResolve<GInstance>(instance: GInstance): void;

    onDispose(): void;
}

export interface IInstanceHook {
    onConstruct(instance: unknown): void;
    onDispose(instance: unknown): void;
}

export class CachedResolvableHook implements IResolvableHook {
    private instances = new Set();

    constructor(private hook: IInstanceHook) {}

    onResolve<GInstance>(instance: GInstance): void {
        if (!this.instances.has(instance)) {
            this.instances.add(instance);
            this.hook.onConstruct(instance);
        }
    }

    onDispose(): void {
        for (const instance of this.instances) {
            this.hook.onDispose(instance);
        }
        this.instances.clear();
    }
}
