import 'reflect-metadata';
import { IocLocatorBuilder, IServiceLocator } from '../../lib';
import { inject, injectMetadataCollector } from '../1/decorators';

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
        locator = new IocLocatorBuilder(injectMetadataCollector).build();
    });

    it('tee', () => {
        const app = locator.resolve(App, 'duper');
        expect(app.run()).toBe('superduper');
    });
});
