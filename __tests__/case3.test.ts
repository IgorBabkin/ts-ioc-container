import 'reflect-metadata';
import { args, IocInjector, IServiceLocator, ServiceLocator, SimpleInjector } from '../lib';
import { inject, metadataCollector } from './decorators';

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
        locator = new ServiceLocator({
            create: (l) => new IocInjector(l, metadataCollector),
        });
    });

    it('tee', () => {
        const app = locator.resolve(App, 'duper');
        expect(app.run()).toBe('superduper');
    });
});
