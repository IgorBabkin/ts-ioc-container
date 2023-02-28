export interface IMethodReflector {
    // eslint-disable-next-line @typescript-eslint/ban-types

    // eslint-disable-next-line @typescript-eslint/ban-types
    invokeHooksOf<GInstance extends Object>(target: GInstance): void;
}
