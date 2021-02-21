import { ArgsFn } from './IProvider';

export function args(...deps: any[]): ArgsFn {
    return () => [...deps];
}
