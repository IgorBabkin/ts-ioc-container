import 'reflect-metadata';
import { args, IocInjector, IServiceLocator, ServiceLocator } from '../lib';
import { inject, metadataCollector } from './decorators';

class Logger {
    constructor(private prefix: string) {}
    log(value: string): string {
        return this.prefix + value;
    }
}

class App {
    constructor(@inject(Logger, args('super')) private logger: Logger) {}

    run(value: string): string {
        return this.logger.log(value);
    }
}

describe('case1', () => {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = new ServiceLocator({
            create: (l) => new IocInjector(l, metadataCollector),
        });
    });

    it('tee', () => {
        const app = locator.resolve(App);
        expect(app.run('duper')).toBe('superduper');
    });
});
