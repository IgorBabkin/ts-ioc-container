export class RangeType {
    constructor(private tuple: [number, number] = [0, 0]) {}

    from(value: number): this {
        this.tuple[0] = value;
        return this;
    }

    to(value: number): this {
        this.tuple[1] = value;
        return this;
    }

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
