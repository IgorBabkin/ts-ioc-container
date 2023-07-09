import 'reflect-metadata';
import { Container, Provider, ReflectionInjector } from 'ts-ioc-container';
describe('Instances', function () {
    it('should return injected instances', function () {
        class Logger {}

        const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromClass(Logger));
        const scope = container.createScope();

        const logger1 = container.resolve('ILogger');
        const logger2 = scope.resolve('ILogger');

        expect(scope.getInstances().length).toBe(1);
        expect(container.getInstances().length).toBe(2);
    });
});
