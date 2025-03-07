import { fillEmptyIndexes } from '../lib';

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
