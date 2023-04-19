import 'reflect-metadata';
import { MethodReflector } from '../lib';

describe('MethodReflector', function () {
    it('should invoke marked methods', function () {
        const reflector = new MethodReflector('onConstruct');
        const onConstruct = reflector.createMethodHookDecorator();

        class Logger {
            initialized = false;

            @onConstruct
            initialize() {
                this.initialized = true;
            }
        }

        const logger = new Logger();
        reflector.invokeHooksOf(logger);

        expect(logger.initialized).toBe(true);
    });
});
