import { getMethodMetadata, setMethodMetadata } from '../lib';

describe('metadata', () => {
  it('should test setMethodMetadata', () => {
    class Logger {
      @setMethodMetadata('firstname', () => 'John')
      start() {}

      @setMethodMetadata('lastname', () => 'Doe')
      stop() {}
    }

    const logger = new Logger();
    expect(getMethodMetadata('firstname', logger, 'start')).toBe('John');
  });
});
