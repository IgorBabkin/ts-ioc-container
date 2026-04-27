import { pipe } from '../lib';
import { getProxyTarget, isProxy, toLazyIf } from '../lib/utils/proxy';

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

describe('proxy', () => {
  it('should prevent repeated lazy wrapping', () => {
    const target = { value: 1 };
    const lazyTarget = toLazyIf(() => target, true);
    const doubleLazyTarget = toLazyIf(() => lazyTarget, true);
    const tripleLazyTarget = toLazyIf(() => doubleLazyTarget, true);
    const quadrupleLazyTarget = toLazyIf(() => tripleLazyTarget, true);

    expect(isProxy(lazyTarget)).toBe(true);
    expect(isProxy(doubleLazyTarget)).toBe(true);
    expect(isProxy(tripleLazyTarget)).toBe(true);
    expect(isProxy(quadrupleLazyTarget)).toBe(true);
    expect(isProxy(getProxyTarget(doubleLazyTarget))).toBe(false);
    expect(isProxy(getProxyTarget(tripleLazyTarget))).toBe(false);
    expect(isProxy(getProxyTarget(quadrupleLazyTarget))).toBe(false);
    expect(getProxyTarget(doubleLazyTarget)).toBe(target);
    expect(getProxyTarget(tripleLazyTarget)).toBe(target);
    expect(getProxyTarget(quadrupleLazyTarget)).toBe(target);
  });

  it('should return the original target for each level of triple wrapping', () => {
    const target = { value: 1 };
    const firstWrap = toLazyIf(() => target, true);
    const secondWrap = toLazyIf(() => firstWrap, true);
    const thirdWrap = toLazyIf(() => secondWrap, true);

    expect(isProxy(firstWrap)).toBe(true);
    expect(isProxy(secondWrap)).toBe(true);
    expect(isProxy(thirdWrap)).toBe(true);

    expect(getProxyTarget(firstWrap)).toBe(target);
    expect(getProxyTarget(secondWrap)).toBe(target);
    expect(getProxyTarget(thirdWrap)).toBe(target);
  });
});
