import 'reflect-metadata';
import { injectFn as inject, IocInjector, IServiceLocator, ServiceLocator } from '../../lib';

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
        locator = ServiceLocator.fromInjector(new IocInjector());
    });

    it('tee', () => {
        const app = locator.resolve(App);
        expect(app.run('duper')).toBe('superduper');
    });
});
