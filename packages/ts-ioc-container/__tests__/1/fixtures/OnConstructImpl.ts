import { IServiceLocator } from '../../../lib';
import { inject, onConstruct } from '../decorators';

export class OnConstructImpl {
    isConstructed = false;

    @onConstruct
    onInit(): void {
        this.isConstructed = true;
    }
}

export class Logger {
    constructor(private prefix: string) {}

    log(): string {
        return this.prefix;
    }
}

export class App {
    constructor(@inject((l) => l.resolve('logger', 'super')) private logger: Logger) {}

    run(): string {
        return this.logger.log();
    }
}

export class Logger2 {
    constructor(private prefix: string, private prefix2: string) {}

    log(): string {
        return this.prefix + this.prefix2;
    }
}

export class App2 {
    private logger: Logger2;

    constructor(
        @inject((l) => () => l.resolve('logger2', 'super')) private loggerFactory: (prefix2: string) => Logger2,
    ) {
        this.logger = loggerFactory('duper');
    }

    run(): string {
        return this.logger.log();
    }
}

export class Logger3 {
    constructor(private prefix: string, private prefix2: string) {}

    log(): string {
        return this.prefix + this.prefix2;
    }
}

export class App3 {
    constructor(@inject((l) => l.resolve('logger3', 'duper')) private logger: Logger3) {}

    run(): string {
        return this.logger.log();
    }
}

export class App4 {
    constructor(@inject((l) => l.resolve('dep1')) private dep1: string, private locator: IServiceLocator) {}

    run(): string {
        return `${this.dep1}${this.locator.resolve('dep2')}`;
    }
}
