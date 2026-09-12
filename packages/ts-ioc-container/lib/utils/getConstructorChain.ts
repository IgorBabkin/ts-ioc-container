/**
 * Walks a constructor's prototype chain, most-derived first, and collects each
 * class in it: `[Derived, Base, ...]`, stopping before `Function.prototype`.
 *
 * Reading own metadata off each entry in turn is how a class inherits what its
 * ancestors declared — `Reflect.getOwnMetadata` never looks up the chain itself.
 * Anything which is not a function yields an empty chain.
 */
export const getConstructorChain = (ctor: unknown): object[] => {
  const chain: object[] = [];
  let current = ctor;
  while (typeof current === 'function' && current !== Function.prototype) {
    chain.push(current);
    current = Object.getPrototypeOf(current);
  }
  return chain;
};
