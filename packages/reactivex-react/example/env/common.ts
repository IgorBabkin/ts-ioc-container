import { createRootContainer } from '../di';
import { Logger } from '../Logger';
import { Registration } from 'ts-ioc-container';

export function common() {
  return createRootContainer().add(Registration.fromClass(Logger));
}
