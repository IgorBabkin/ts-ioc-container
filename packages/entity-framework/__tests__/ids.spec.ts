import { type IIdGenerator, pooled, uuidV7Ids } from '../lib';

describe('ids', () => {
  // A sequence that counts its round trips.
  const sequence = () => {
    let value = 0;
    const generator = {
      calls: 0,
      async next(): Promise<number> {
        generator.calls++;
        return ++value;
      },
    };
    return generator;
  };

  describe('pooled', () => {
    it('reaches the inner generator once per block of ids (hi/lo)', async () => {
      const inner = sequence();
      const ids = pooled(3)(inner);

      const taken: number[] = [];
      for (let i = 0; i < 7; i++) taken.push(await ids.next());

      expect(taken).toEqual([3, 4, 5, 6, 7, 8, 9]);
      expect(inner.calls).toBe(3);
    });

    it('shares one refill between concurrent calls, and never hands out an id twice', async () => {
      const inner = sequence();
      const ids: IIdGenerator<number> = pooled(2)(inner);

      const taken = await Promise.all(Array.from({ length: 5 }, () => ids.next()));

      expect(new Set(taken).size).toBe(5);
      expect(inner.calls).toBe(3);
    });

    it('rejects a block size that is not a positive integer', () => {
      expect(() => pooled(0)).toThrow(RangeError);
      expect(() => pooled(1.5)).toThrow(RangeError);
    });
  });

  describe('uuidV7Ids', () => {
    it('makes RFC 9562 version 7 UUIDs', async () => {
      const id = await uuidV7Ids().next();

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('starts with the time it was made in milliseconds, so ids sort by creation time', async () => {
      const ids = uuidV7Ids({ now: () => 0x0189_1234_5678, random: (bytes) => bytes.fill(0xff) });

      expect(await ids.next()).toBe('01891234-5678-7fff-bfff-ffffffffffff');
    });

    it('differs on every call', async () => {
      const ids = uuidV7Ids();

      const taken = await Promise.all(Array.from({ length: 100 }, () => ids.next()));

      expect(new Set(taken).size).toBe(100);
    });
  });
});
