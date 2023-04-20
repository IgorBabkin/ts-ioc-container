import 'reflect-metadata';
import { AsyncMethodReflector } from '../lib';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AsyncMethodReflector', function () {
    it('should invoke marked methods', async function () {
        const reflector = new AsyncMethodReflector('onDispose');
        const onDispose = reflector.createMethodHookDecorator();

        class Logger {
            value = '';

            @onDispose
            async dispose(value: string) {
                await sleep(1000);
                this.value = value;
            }
        }

        const logger = new Logger();
        await reflector.invokeHooksOf(logger, 'disposed');

        expect(logger.value).toBe('disposed');
    });
});
