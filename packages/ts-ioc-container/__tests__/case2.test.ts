import 'reflect-metadata';
import {
    args,
    Hook,
    inject,
    IocServiceLocatorStrategy,
    IServiceLocator,
    metadataCollector,
    ServiceLocator,
} from '../lib';

class Logger {
    constructor(private prefix: string) {}
    log(value: string): string {
        return this.prefix + value;
    }
}

class App {
    @inject(Logger, args('super')) private logger: Logger;

    run(value: string): string {
        return this.logger.log(value);
    }
}

describe('case1', () => {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new ServiceLocator(new IocServiceLocatorStrategy(metadataCollector), new Hook([]));
    });

    it('tee', () => {
        const app = locator.resolve(App);
        expect(app.run('duper')).toBe('superduper');
    });
});
