import { Factory, inject, onConstruct } from '../../lib';
import { args } from '../../lib/helpers';

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
    constructor(@inject('logger', args('super')) private logger: Logger) {}

    public run(): string {
        return this.logger.log();
    }
}

export class Logger2 {
    constructor(private prefix: string, private prefix2: string, private postfix: string) {}

    log(): string {
        return this.prefix + this.prefix2 + this.postfix;
    }
}

export class App2 {
    private logger: Logger2;

    constructor(
        @inject(Factory('logger2', args('super')), args('duper')) private loggerFactory: (prefix2: string) => Logger2,
    ) {
        this.logger = loggerFactory('18');
    }

    public run(): string {
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
    constructor(@inject('logger3', args('super')) private logger: Logger3) {}

    public run(): string {
        return this.logger.log();
    }
}
