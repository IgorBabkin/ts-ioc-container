import { IRangeType } from './IRangeType';

export class RangeType implements IRangeType {
    constructor(private range: [number, number] = [0, Infinity]) {}

    from(value: number): this {
        this.range[0] = value;
        return this;
    }

    to(value: number): this {
        this.range[1] = value;
        return this;
    }

    isValid(value: number): boolean {
        const [from, to] = this.range;
        return from <= value && value <= to;
    }

    toString(): string {
        const [from, to] = this.range;
        return `[${from}, ${to}]`;
    }
}