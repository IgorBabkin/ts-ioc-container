import { getConstructorChain, pipe } from '../lib';
import { ProxyRegistry, unwrapProxy } from '../lib/utils/ProxyRegistry';

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
  const proxies = ProxyRegistry.getInstance();

  it('should prevent repeated lazy wrapping', () => {
    const target = { value: 1 };
    const lazyTarget = proxies.toLazyIf(() => target, true);
    const doubleLazyTarget = proxies.toLazyIf(() => lazyTarget, true);
    const tripleLazyTarget = proxies.toLazyIf(() => doubleLazyTarget, true);
    const quadrupleLazyTarget = proxies.toLazyIf(() => tripleLazyTarget, true);

    expect(lazyTarget).not.toBe(target);
    expect(doubleLazyTarget).not.toBe(lazyTarget);
    expect(tripleLazyTarget).not.toBe(doubleLazyTarget);
    expect(quadrupleLazyTarget).not.toBe(tripleLazyTarget);

    expect(proxies.unwrap(lazyTarget)).toBe(target);
    expect(proxies.unwrap(doubleLazyTarget)).toBe(target);
    expect(proxies.unwrap(tripleLazyTarget)).toBe(target);
    expect(proxies.unwrap(quadrupleLazyTarget)).toBe(target);

    // unwrapping is idempotent - the result is never itself a proxy
    expect(proxies.unwrap(proxies.unwrap(quadrupleLazyTarget))).toBe(target);
  });

  it('should expose unwrapProxy as a shortcut for the singleton', () => {
    const target = { value: 1 };
    const proxy = proxies.createProxy(target, {});
    const lazyProxy = proxies.createLazyProxy(() => proxy);

    expect(unwrapProxy(proxy)).toBe(target);
    expect(unwrapProxy(lazyProxy)).toBe(target);
    // a plain value passes through untouched
    expect(unwrapProxy(target)).toBe(target);
  });

  it('should return the original target for each level of triple wrapping', () => {
    const target = { value: 1 };
    const firstWrap = proxies.toLazyIf(() => target, true);
    const secondWrap = proxies.toLazyIf(() => firstWrap, true);
    const thirdWrap = proxies.toLazyIf(() => secondWrap, true);

    expect(firstWrap).not.toBe(target);
    expect(secondWrap).not.toBe(firstWrap);
    expect(thirdWrap).not.toBe(secondWrap);

    expect(proxies.unwrap(firstWrap)).toBe(target);
    expect(proxies.unwrap(secondWrap)).toBe(target);
    expect(proxies.unwrap(thirdWrap)).toBe(target);
  });

  it('should forward writes made through a lazy proxy to the real target', () => {
    class Counter {
      value = 0;

      increment() {
        this.value += 1;
      }
    }

    const target = new Counter();
    const lazyTarget = proxies.toLazyIf(() => target, true);

    // `this` inside `increment` is the proxy, so the write only lands if the proxy forwards it
    lazyTarget.increment();
    expect(target.value).toBe(1);
    expect(lazyTarget.value).toBe(1);

    lazyTarget.value = 42;
    expect(target.value).toBe(42);
  });

  describe('createProxy', () => {
    class Sender {
      readonly sent: string[] = [];

      send(message: string): string {
        this.sent.push(message);
        return `sent: ${message}`;
      }
    }

    const mediator = <T extends object>(target: T, log: string[]): T =>
      proxies.createProxy(target, {
        get(obj, prop, receiver) {
          const value = Reflect.get(obj, prop, receiver);
          if (typeof value !== 'function') {
            return value;
          }
          return (...args: unknown[]) => {
            log.push(String(prop));
            return value.apply(obj, args);
          };
        },
      });

    it('should mediate calls to the target class and expose it via unwrap', () => {
      const target = new Sender();
      const log: string[] = [];

      const proxy = mediator(target, log);

      expect(proxy.send('hello')).toBe('sent: hello');
      expect(log).toEqual(['send']);
      expect(target.sent).toEqual(['hello']);
      expect(proxy).not.toBe(target);
      expect(proxies.unwrap(proxy)).toBe(target);
    });

    it('should unwrap the deeply nested target of stacked mediators', () => {
      const target = new Sender();
      const log: string[] = [];

      const proxy = mediator(mediator(mediator(target, log), log), log);

      expect(proxy.send('hello')).toBe('sent: hello');
      expect(log).toEqual(['send', 'send', 'send']);
      expect(proxies.unwrap(proxy)).toBe(target);
    });

    it('should unwrap the target of a mediator wrapping a lazy proxy', () => {
      const target = new Sender();
      const log: string[] = [];

      const proxy = mediator(
        proxies.toLazyIf(() => target, true),
        log,
      );

      expect(proxies.unwrap(proxy)).toBe(target);
    });
  });
});

describe('getConstructorChain', () => {
  class Base {}
  class Middle extends Base {}
  class Derived extends Middle {}

  it('walks the prototype chain most-derived first', () => {
    expect(getConstructorChain(Derived)).toEqual([Derived, Middle, Base]);
  });

  it('stops before Function.prototype', () => {
    expect(getConstructorChain(Base)).toEqual([Base]);
    expect(getConstructorChain(Function.prototype)).toEqual([]);
  });

  it('returns an empty chain for anything which is not a function', () => {
    expect(getConstructorChain(new Derived())).toEqual([]);
    expect(getConstructorChain(undefined)).toEqual([]);
    expect(getConstructorChain('Derived')).toEqual([]);
  });
});
