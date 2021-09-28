export interface Initializable {
    initialize(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
export function isInitializable(instance: any): instance is Initializable {
    return instance && instance['initialize'];
}
