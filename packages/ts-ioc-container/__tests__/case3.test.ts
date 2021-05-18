import 'reflect-metadata';
import { args, inject, IServiceLocator, metadataCollector, ServiceLocator } from '../lib';
import { IocInjectorFactory } from '../lib/injector/ioc/IocInjectorFactory';
import { HookFactory } from '../lib/hooks/HookFactory';

class Logger {
    constructor(private prefix: string) {}
    log(value: string): string {
        return this.prefix + value;
    }
}

class App {
    constructor(private value: string, @inject(Logger, args('super')) private logger: Logger) {}

    run(): string {
        return this.logger.log(this.value);
    }
}

describe('case3', () => {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new ServiceLocator(new IocInjectorFactory(metadataCollector), new HookFactory([]));
    });

    it('tee', () => {
        const app = locator.resolve(App, 'duper');
        expect(app.run()).toBe('superduper');
    });
});
