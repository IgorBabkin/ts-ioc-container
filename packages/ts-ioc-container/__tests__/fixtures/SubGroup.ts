import { injectParam } from '../../lib';

export class SubGroup {
    constructor(@injectParam('key2') private hey: string) {}

    privet(): string[] {
        return [this.hey];
    }
}
