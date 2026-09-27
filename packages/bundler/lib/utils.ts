/** Decides whether a value is kept. The base of every predicate the bundler takes. */
export type FilterPredicate<Target> = (value: Target) => boolean;
