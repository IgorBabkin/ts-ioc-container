import { IScopeContext } from './IScopeContext';

export class ScopeContext<T> implements IScopeContext<T> {
  constructor(private value: T) {}

  getValue(): T {
    return this.value;
  }
}
