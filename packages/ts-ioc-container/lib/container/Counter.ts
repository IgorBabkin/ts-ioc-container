export class Counter {
  constructor(private current = 0) {}

  next(): string {
    return (this.current++).toString();
  }
}
