import { pipe } from '../lib/utils/fp';
import { fillEmptyIndexes } from '../lib/utils/array';

describe('utils', () => {
  it('should merge arrays', function () {
    const result = fillEmptyIndexes([0, undefined, 2, undefined, 4], [1, 3, 5]);

    expect(result).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('should merge arrays 2', function () {
    const result = fillEmptyIndexes([undefined, 1, undefined, 3], [0, 2, 4]);

    expect(result).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('fp', () => {
  it('should work with single transformation (same type)', () => {
    const double = (x: number) => x * 2;
    const result = pipe(double);

    expect(result(5)).toBe(10);
  });

  it('should work with single transformation (different types)', () => {
    const toString = (x: number): string => String(x);
    const result = pipe(toString);

    expect(result(42)).toBe('42');
  });

  it('should work with two transformations', () => {
    const double = (x: number) => x * 2;
    const toString = (x: number): string => String(x);
    const result = pipe(double, toString);

    expect(result(5)).toBe('10');
  });

  it('should work with three transformations', () => {
    const double = (x: number) => x * 2;
    const toString = (x: number): string => String(x);
    const addExclamation = (s: string) => s + '!';
    const result = pipe(double, toString, addExclamation);

    expect(result(5)).toBe('10!');
  });

  it('should work with complex type transformations', () => {
    interface User {
      name: string;
      age: number;
    }

    const getAge = (user: User) => user.age;
    const isAdult = (age: number) => age >= 18;
    const toMessage = (isAdult: boolean) => (isAdult ? 'Adult' : 'Minor');

    const result = pipe(getAge, isAdult, toMessage);

    expect(result({ name: 'Alice', age: 25 })).toBe('Adult');
    expect(result({ name: 'Bob', age: 15 })).toBe('Minor');
  });

  it('should work with many transformations', () => {
    const add1 = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const toString = (x: number): string => String(x);
    const repeat = (s: string) => s + s;
    const addPrefix = (s: string) => 'result: ' + s;

    const result = pipe(add1, double, add1, double, toString, repeat, addPrefix);

    // (5 + 1) * 2 + 1 = 13, 13 * 2 = 26, "26", "2626", "result: 2626"
    expect(result(5)).toBe('result: 2626');
  });

  it('should handle identity transformation', () => {
    const identity = <T>(x: T) => x;
    const result = pipe(identity);

    expect(result(42)).toBe(42);
    expect(result('test')).toBe('test');
  });

  it('should work with object transformations', () => {
    interface Person {
      firstName: string;
      lastName: string;
    }

    interface FullName {
      full: string;
    }

    const toFullName = (p: Person): FullName => ({
      full: `${p.firstName} ${p.lastName}`,
    });

    const extractFull = (fn: FullName) => fn.full;
    const toUpperCase = (s: string) => s.toUpperCase();

    const result = pipe(toFullName, extractFull, toUpperCase);

    expect(result({ firstName: 'John', lastName: 'Doe' })).toBe('JOHN DOE');
  });
});
