import { inject } from '../../lib/strategy/ioc/decorators';

export class SubGroup {
    constructor(@inject('key2') private hey: string) {}

    privet(): string[] {
        return [this.hey];
    }
}
