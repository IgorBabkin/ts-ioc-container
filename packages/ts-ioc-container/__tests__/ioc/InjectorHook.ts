export interface InjectorHook {
    onConstruct<T>(instance: T): T;
}