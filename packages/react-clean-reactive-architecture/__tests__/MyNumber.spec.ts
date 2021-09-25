import { MyNumber } from '../lib';

describe('MyNumber', () => {
  it('should add 2 numbers', () => {
    const number = new MyNumber(5);
    number.add(3);

    expect(number.getValue()).toBe(8);
  });

  it('should subtract 2 numbers', () => {
    const number = new MyNumber(5);
    number.sub(3);

    expect(number.getValue()).toBe(2);
  });
});
