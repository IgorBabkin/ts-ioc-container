import { getMethodMeta, methodMeta } from '../lib';

describe('metadata', () => {
  it('should test methodMeta', () => {
    class Logger {
      @methodMeta('firstname', () => 'John')
      start() {}

      @methodMeta('lastname', () => 'Doe')
      stop() {}
    }

    const logger = new Logger();
    expect(getMethodMeta('firstname', logger, 'start')).toBe('John');
  });
});
