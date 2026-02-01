export const promisify = <T>(arg: T | Promise<T>): Promise<T> => (arg instanceof Promise ? arg : Promise.resolve(arg));
