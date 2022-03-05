export type Write<T> = [T, string[]];
export const pure = <T>(value: T): Write<T> => [value, []];
export const run = <T>([value]: Write<T>): T => value;
