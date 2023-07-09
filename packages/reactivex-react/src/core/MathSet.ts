export class MathSet<T> {
  static fromIterator<T>(iterator: IterableIterator<T>): MathSet<T> {
    return new MathSet(new Set(iterator));
  }

  constructor(private decorated: Set<T> = new Set()) {}

  subtract(b: MathSet<T>): this {
    for (const item of b) {
      if (this.decorated.has(item)) {
        this.decorated.delete(item);
      }
    }
    return this;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.decorated[Symbol.iterator]();
  }

  toSet(): Set<T> {
    return this.decorated;
  }
}
