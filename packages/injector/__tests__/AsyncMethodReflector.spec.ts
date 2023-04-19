import 'reflect-metadata';
import { AsyncMethodReflector } from '../lib';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AsyncMethodReflector', function () {
    it('should invoke marked methods', async function () {
        const reflector = new AsyncMethodReflector('onDispose');
        const onDispose = reflector.createMethodHookDecorator();

        class Logger {
            disposed = false;

            @onDispose
            async dispose() {
                await sleep(1000);
                this.disposed = true;
            }
        }

        const logger = new Logger();
        await reflector.invokeHooksOf(logger);

        expect(logger.disposed).toBe(true);
    });
});
