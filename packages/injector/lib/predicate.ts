import { constructor } from './types';
import { getProp, prop } from './metadata';
import { EntityNotFoundError } from './errors/EntityNotFoundError';

export type Predicate = <Value>(error: Value) => boolean;

export function getPredicate(Target: constructor<any>): Predicate {
    const predicate = getProp<Predicate>(Target, 'predicate');
    if (!predicate) {
        throw new EntityNotFoundError('Predicate is not provided');
    }
    return predicate;
}

export const predicate = (fn: Predicate) => prop('predicate', fn);
