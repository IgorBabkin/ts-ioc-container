import { inject } from '../../ioc/IocInjector';

export class SubGroup {
    constructor(@inject((l) => l.resolve('key2')) private hey: string) {}

    privet(): string[] {
        return [this.hey];
    }
}
