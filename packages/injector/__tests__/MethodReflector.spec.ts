import 'reflect-metadata';
import { MethodReflector } from '../lib';

describe('MethodReflector', function () {
    it('should invoke marked methods', function () {
        const reflector = new MethodReflector('onConstruct');
        const onConstruct = reflector.createMethodHookDecorator();

        class Logger {
            initialized = '';

            @onConstruct
            initialize(value: string) {
                this.initialized = value;
            }
        }

        const logger = new Logger();
        reflector.invokeHooksOf(logger, 'initialized');

        expect(logger.initialized).toBe('initialized');
    });
});
