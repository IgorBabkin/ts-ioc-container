import 'reflect-metadata';
import { asSingleton, Container, forKey, provider, ReflectionInjector, Registration } from '../lib';

@forKey('logger')
@provider(asSingleton())
class Logger {}

describe('Singleton', function () {
    function createContainer() {
        return new Container(new ReflectionInjector());
    }

    it('should resolve the same container per every request', function () {
        const container = createContainer().add(Registration.fromClass(Logger));

        expect(container.resolve('logger')).toBe(container.resolve('logger'));
    });

    it('should resolve different dependency per scope', function () {
        const container = createContainer().add(Registration.fromClass(Logger));
        const child = container.createScope();

        expect(container.resolve('logger')).not.toBe(child.resolve('logger'));
    });

    it('should resolve the same dependency for scope', function () {
        const container = createContainer().add(Registration.fromClass(Logger));
        const child = container.createScope();

        expect(child.resolve('logger')).toBe(child.resolve('logger'));
    });
});
