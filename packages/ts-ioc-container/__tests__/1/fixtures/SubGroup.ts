import { injectFn as inject } from '../../../lib';

export class SubGroup {
    constructor(@inject((l) => l.resolve('key2')) private hey: string) {}

    privet(): string[] {
        return [this.hey];
    }
}
