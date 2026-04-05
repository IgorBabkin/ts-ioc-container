import { getMethodMetadata, methodMetadata } from '../lib';

describe('metadata', () => {
  it('should test methodMetadata', () => {
    class Logger {
      @methodMetadata('firstname', () => 'John')
      start() {}

      @methodMetadata('lastname', () => 'Doe')
      stop() {}
    }

    const logger = new Logger();
    expect(getMethodMetadata('firstname', logger, 'start')).toBe('John');
  });
});
