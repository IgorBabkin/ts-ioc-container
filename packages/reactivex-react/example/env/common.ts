import { createRootContainer } from '../di';
import { Logger } from '../Logger';
import { Registration as R } from 'ts-ioc-container';

export function common() {
  return createRootContainer().use(R.fromClass(Logger));
}
