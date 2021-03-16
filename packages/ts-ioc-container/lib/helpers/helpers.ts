import { ArgsFn } from '../provider/IProvider';

export function args(...deps: any[]): ArgsFn {
    return () => [...deps];
}
