import { inject } from '../strategy/ioc/decorators';

export class SubGroup3 {
    constructor(@inject('key1') private p1: string, @inject('key2') private p2: string) {}

    public privet(): string[] {
        return [this.p1, this.p2];
    }
}
