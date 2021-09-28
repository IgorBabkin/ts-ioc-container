export interface IDisposable {
    dispose(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
export function isDisposable(instance: any): instance is IDisposable {
    return instance && instance['dispose'];
}
