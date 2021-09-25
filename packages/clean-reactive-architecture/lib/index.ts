export class MyNumber {
  constructor(private value: number) {}

  add(value: number): void {
    this.value += value;
  }

  sub(value: number): void {
    this.value -= value;
  }

  getValue(): number {
    return this.value;
  }
}
