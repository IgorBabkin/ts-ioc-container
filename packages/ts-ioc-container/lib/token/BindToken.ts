import { IRegistration } from '../registration/IRegistration';

import { Is } from '../utils/basic';

export interface BindToken<T = any> {
  bindTo(r: IRegistration<T>): void;
}

export function isBindToken(token: unknown): token is BindToken {
  return !Is.nullish(token) && typeof token === 'object' && 'bindTo' in token;
}
