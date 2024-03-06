import 'reflect-metadata';
import { getHooks, hook } from '../lib';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('reflection', function () {
  it('should invoke hook methods', async function () {
    class Logger {
      value = '';

      @hook('onDispose')
      async dispose(value: string) {
        await sleep(1000);
        this.value = value;
      }
    }

    const logger = new Logger();
    for (const method of getHooks(logger, 'onDispose')) {
      // @ts-ignore
      await logger[method]('disposed');
    }

    expect(logger.value).toBe('disposed');
  });
});
