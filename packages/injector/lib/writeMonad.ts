export type Write<T> = [T, string[]];
export function pure<T>(value: T): Write<T> {
    return [value, []];
}
export function run<T>([value]: Write<T>): T {
    return value;
}

export type WriteFn<A, B> = (value: Write<A>, ...args: any[]) => Write<B>;
