import { YardiCredentials } from './YardiCredentials';

export const IEnvKey = Symbol('IEnv');

export interface IEnv {
  yardi: YardiCredentials;
}
