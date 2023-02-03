import { ContextNullError } from './ContextNullError';
import { IContext } from './IContext';

export class Context<T> implements IContext<T> {
  constructor(private name: string, private value: T | null = null) {}

  getValue(): T {
    if (this.value === null) {
      throw new ContextNullError(`Context(${this.name}) is null`);
    }
    return this.value;
  }

  hasValue(): boolean {
    return this.value !== null;
  }

  setValue(value: T): void {
    this.value = value;
  }
}
