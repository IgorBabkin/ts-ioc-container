import { ILocatorContext } from './ILocatorContext';

export class LocatorContext<T> implements ILocatorContext<T> {
    constructor(private value: T) {}

    getValue(): T {
        return this.value;
    }
}
