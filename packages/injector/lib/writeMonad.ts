import { constructor } from './types';
import { to } from './utils';

export type Write<T> = [T, string[]];
export function pure<T>(value: T): Write<T> {
    return [value, []];
}
export function run<T>([value]: Write<T>): T {
    return value;
}

export type WriteFn<A, B> = (value: Write<A>) => Write<B>;

export const toWrite =
    <T>(value: constructor<T>) =>
    <Context>([env, logs]: Write<Context>): Write<T> => {
        return [to(value)(env), logs];
    };
