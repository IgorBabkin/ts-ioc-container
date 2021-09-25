import 'reflect-metadata';
import { IocLocatorBuilder, IServiceLocator } from '../../lib';
import { injectMetadataCollector, inject } from './decorators';

class Logger {
    constructor(private prefix: string) {}
    log(value: string): string {
        return this.prefix + value;
    }
}

class App {
    constructor(@inject((l) => l.resolve(Logger, 'super')) private logger: Logger) {}

    run(value: string): string {
        return this.logger.log(value);
    }
}

describe('case1', () => {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new IocLocatorBuilder(injectMetadataCollector).build();
    });

    it('tee', () => {
        const app = locator.resolve(App);
        expect(app.run('duper')).toBe('superduper');
    });
});