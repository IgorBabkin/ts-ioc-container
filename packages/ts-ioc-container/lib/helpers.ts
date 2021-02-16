import { ArgsFn } from './IRegistration';

export function args(...deps: any[]): ArgsFn {
    return () => [...deps];
}
