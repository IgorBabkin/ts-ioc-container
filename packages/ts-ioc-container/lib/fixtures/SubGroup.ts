import { inject } from '../strategy/ioc/decorators';

export class SubGroup {
    constructor(@inject('key2') private hey: string) {}

    public privet(): string[] {
        return [this.hey];
    }
}
