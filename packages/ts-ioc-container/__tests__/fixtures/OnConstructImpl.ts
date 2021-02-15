import { Factory, inject, onConstruct } from '../../lib';

export class OnConstructImpl {
    public isConstructed = false;

    @onConstruct
    public onInit(): void {
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
    constructor(@inject('logger', 'super') private logger: Logger) {}

    public run(): string {
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

    constructor(@inject(Factory('logger', 'super')) private loggerFactory: (prefix2: string) => Logger2) {
        this.logger = loggerFactory('duper');
    }

    public run(): string {
        return this.logger.log();
    }
}
