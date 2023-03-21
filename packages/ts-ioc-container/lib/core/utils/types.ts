export type constructor<T> = new (...args: any[]) => T;

export class Box<T> {
    constructor(public value: T) {}
}

export interface Disposable {
    dispose(): void;
}
