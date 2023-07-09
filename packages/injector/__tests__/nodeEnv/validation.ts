import { ArgumentNullError } from './ArgumentNullError';
import { Write } from '../../lib';

export function isBlank<T>(value: T | null | undefined): value is undefined | null {
  return value === undefined || value === null;
}

export const required = <T>([value, logs]: Write<T | null | undefined>): Write<T> => {
  if (isBlank(value)) {
    throw new ArgumentNullError(logs.join(', '));
  }
  return [value, logs];
};
