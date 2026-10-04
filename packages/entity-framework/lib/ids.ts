/**
 * How the ids of new records are made: a strategy, chosen per repository when
 * it is registered. Each call reserves an id no other call gets, before the
 * record is written — so a new record has its id from the moment it is added.
 *
 * @example
 * @register(IOrderIdsToken, scope((s) => s.hasTag('application')), decorate(pooled(50)), singleton())
 * class OrderIds implements IIdGenerator<number> {
 *   constructor(@inject(by(IDbToken)) private readonly db: Db) {}
 *   next() {
 *     return this.db.one(`SELECT nextval('order_blocks')`);
 *   }
 * }
 */
export interface IIdGenerator<Id> {
  next(): Promise<Id>;
}

/**
 * Decorates a generator of numeric ids so it is reached once per `size` ids:
 * each number it answers is a block, handed out as `block * size` up to
 * `block * size + size - 1` (hi/lo). Concurrent calls share one refill. The
 * inner generator — a database sequence, say — must serve only this pool, or
 * its numbers and the pool's ids would collide.
 *
 * Apply it where the generator is registered, so the pool lives as long as the
 * generator does: `decorate(pooled(50))` next to `singleton()`.
 *
 * @example
 * const ids = pooled(50)(sequence); // one round trip per 50 ids
 *
 * @throws {RangeError} when `size` is not a positive integer.
 */
export const pooled = (size: number): ((inner: IIdGenerator<number>) => IIdGenerator<number>) => {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`A pool of ids holds a positive whole number of them, not ${size}.`);
  }
  return (inner) => new PooledIds(inner, size);
};

class PooledIds implements IIdGenerator<number> {
  private block = 0;
  private taken: number;
  private refill?: Promise<void>;

  constructor(
    private readonly inner: IIdGenerator<number>,
    private readonly size: number,
  ) {
    this.taken = size;
  }

  async next(): Promise<number> {
    while (this.taken >= this.size) {
      this.refill ??= this.inner
        .next()
        .then((block) => {
          this.block = block;
          this.taken = 0;
        })
        .finally(() => {
          this.refill = undefined;
        });
      await this.refill;
    }
    return this.block * this.size + this.taken++;
  }
}

export interface UuidV7Options {
  /** The current time in milliseconds; `Date.now` by default. */
  now?: () => number;
  /** Fills `bytes` with random values; the Web Crypto `getRandomValues` by default. */
  random?: (bytes: Uint8Array) => Uint8Array;
}

/**
 * Makes RFC 9562 version 7 UUIDs: the time in milliseconds, then random bits,
 * so ids sort by when they were made and need no round trip to the database.
 * Needs the Web Crypto API (Node 19+, every current browser) unless `random`
 * is given.
 *
 * @example
 * @register(IOrderIdsToken, scope((s) => s.hasTag('application')), singleton())
 * class OrderIds implements IIdGenerator<string> {
 *   private readonly uuids = uuidV7Ids();
 *   next() {
 *     return this.uuids.next();
 *   }
 * }
 */
export const uuidV7Ids = ({
  now = Date.now,
  random = (bytes) => globalThis.crypto.getRandomValues(bytes),
}: UuidV7Options = {}): IIdGenerator<string> => ({
  async next() {
    const bytes = random(new Uint8Array(16));
    const time = now();
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(time / 2 ** (8 * (5 - i))) % 256;
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  },
});
