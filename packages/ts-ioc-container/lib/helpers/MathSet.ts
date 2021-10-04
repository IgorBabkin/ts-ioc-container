export class MathSet<T> {
    static fromArray<T>(values: T[]): MathSet<T> {
        return new MathSet(new Set(values));
    }

    constructor(private a: Set<T> = new Set()) {}

    hasIntersection(b: MathSet<T>): boolean {
        for (const value of this.a) {
            if (b.has(value)) {
                return true;
            }
        }
        return false;
    }

    has(value: T): boolean {
        return this.a.has(value);
    }

    toArray(): T[] {
        return Array.from(this.a.values());
    }
}
