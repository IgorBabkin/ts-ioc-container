import { IRegistration } from '../registration/IRegistration';

import { Is } from '../utils/basic';

/** A token that can bind a registration to itself (a key or an alias). */
export interface BindToken<T = any> {
  bindTo(r: IRegistration<T>): void;
}

/** Narrows `token` to a {@link BindToken}. */
export function isBindToken(token: unknown): token is BindToken {
  return !Is.nullish(token) && typeof token === 'object' && 'bindTo' in token;
}
