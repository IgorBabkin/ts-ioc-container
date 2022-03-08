import { WriteFn, InjectionDecorator, inject as injectFn } from '../../lib';

export type NodeEnv = Record<string, string | undefined>;
export const inject: InjectionDecorator<NodeEnv> = injectFn;

export const env =
    (key: string): WriteFn<NodeEnv, string | undefined> =>
    ([value, logs]) => {
        return [value[key], [...logs, `ENV ${key}`]];
    };
