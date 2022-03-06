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
    constructor(
        private value: string,
        @inject(w((l, ...args) => l.resolve(Logger, 'super', ...args))) private logger: Logger,
    ) {}

    run(): string {
        return this.logger.log(this.value);
    }
}

describe('case3', () => {
    let locator: IServiceLocator;

    beforeEach(() => {
        locator = ServiceLocator.fromInjector(new IocInjector());
    });

    it('tee', () => {
        const app = locator.resolve(App, 'duper');
        expect(app.run()).toBe('superduper');
    });
});
