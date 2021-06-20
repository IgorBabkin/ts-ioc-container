import 'reflect-metadata';
import { IocInjector, IServiceLocator, ProviderRepository, ServiceLocator } from '../../lib';
import { constructorMetadataCollector, inject } from '../1/decorators';

class Logger {
    constructor(private prefix: string) {}

    log(value: string): string {
        return this.prefix + value;
    }
}

class App {
    constructor(
        private value: string,
        @inject((l, ...args) => l.resolve(Logger, 'super', ...args)) private logger: Logger,
    ) {}

    run(): string {
        return this.logger.log(this.value);
    }
}

describe('case3', () => {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new ServiceLocator(new IocInjector(constructorMetadataCollector), new ProviderRepository());
    });

    it('tee', () => {
        const app = locator.resolve(App, 'duper');
        expect(app.run()).toBe('superduper');
    });
});
