import { ArgsFn } from '../provider/IProvider';

export function args(...deps: any[]): ArgsFn {
    return () => [...deps];
}

export function merge<T>(baseArr: T | undefined, insertArr: T): T {
    return baseArr;
}
