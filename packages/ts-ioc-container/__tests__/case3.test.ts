import 'reflect-metadata';
import { args, Hook, injectParam, IocInjector, IServiceLocator, metadataCollector, ServiceLocator } from '../lib';

class Logger {
    constructor(private prefix: string) {}
    log(value: string): string {
        return this.prefix + value;
    }
}

class App {
    constructor(private value: string, @injectParam(Logger, args('super')) private logger: Logger) {}

    run(): string {
        return this.logger.log(this.value);
    }
}

describe('case3', () => {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new ServiceLocator(new IocInjector(metadataCollector), new Hook([]));
    });

    it('tee', () => {
        const app = locator.resolve(App, 'duper');
        expect(app.run()).toBe('superduper');
    });
});
