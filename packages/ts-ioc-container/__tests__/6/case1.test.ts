import 'reflect-metadata';
import { IServiceLocator, ServiceLocator } from '../../lib';
import { inject, IocInjector, withoutLogs as w } from '../ioc/IocInjector';

class Logger {
    constructor(private prefix: string) {}
    log(value: string): string {
        return this.prefix + value;
    }
}

class App {
    constructor(@inject(w((l) => l.resolve(Logger, 'super'))) private logger: Logger) {}

    run(value: string): string {
        return this.logger.log(value);
    }
}

describe('case1', () => {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = ServiceLocator.fromInjector(new IocInjector());
    });

    it('tee', () => {
        const app = locator.resolve(App);
        expect(app.run('duper')).toBe('superduper');
    });
});
