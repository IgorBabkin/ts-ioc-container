import 'reflect-metadata';
import { IocInjector, IServiceLocator, ProviderRepository, ServiceLocator } from '../../lib';
import { constructorMetadataCollector, inject } from './decorators';

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
        locator = new ServiceLocator(new IocInjector(constructorMetadataCollector), new ProviderRepository());
    });

    it('tee', () => {
        const app = locator.resolve(App);
        expect(app.run('duper')).toBe('superduper');
    });
});
