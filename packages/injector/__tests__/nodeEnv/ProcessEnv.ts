import { IEnv } from './IEnv';
import { inject, NodeEnv } from './nodeEnvDecorators';
import { YardiCredentials } from './YardiCredentials';
import { pipe, resolve, to } from '../../lib';

export class ProcessEnv implements IEnv {
    static create(env: NodeEnv): ProcessEnv {
        return resolve(env)(ProcessEnv);
    }

    constructor(@inject(pipe(to(YardiCredentials))) public yardi: YardiCredentials) {}
}
