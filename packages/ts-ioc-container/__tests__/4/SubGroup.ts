import { inject, withoutLogs as w } from '../ioc/IocInjector';

export class SubGroup {
    constructor(@inject(w((l) => l.resolve('key2'))) private hey: string) {}

    privet(): string[] {
        return [this.hey];
    }
}
