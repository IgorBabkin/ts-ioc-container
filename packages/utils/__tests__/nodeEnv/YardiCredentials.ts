import { env, inject } from './nodeEnvDecorators';
import { required } from './validation';
import { pipeWrite as pipe } from '../../lib';

export class YardiCredentials {
  constructor(@inject(pipe(env('SOME_VAR'), required)) public username: string) {}
}
