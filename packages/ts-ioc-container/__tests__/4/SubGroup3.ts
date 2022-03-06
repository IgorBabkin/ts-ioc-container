import { inject, withoutLogs as w } from '../ioc/IocInjector';

export class SubGroup3 {
    constructor(
        @inject(w((l) => l.resolve('key1'))) private p1: string,
        @inject(w((l) => l.resolve('key2'))) private p2: string,
    ) {}

    privet(): string[] {
        return [this.p1, this.p2];
    }
}
