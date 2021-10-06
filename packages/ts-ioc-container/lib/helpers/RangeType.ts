export class RangeType {
    constructor(private tuple: [number, number] = [0, 0]) {}

    includes(value: number): boolean {
        const [from, to] = this.tuple;
        return from <= value && value <= to;
    }

    toString(): string {
        const [from, to] = this.tuple;
        return `[${from}, ${to}]`;
    }

    toTuple(): [number, number] {
        const [from, to] = this.tuple;
        return [from, to];
    }
}
