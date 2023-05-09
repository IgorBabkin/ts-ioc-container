import { createRootContainer } from '../di';
import { fromClass } from 'ts-ioc-container';
import { Logger } from '../Logger';

export function common() {
    return createRootContainer().register(fromClass(Logger).build());
}
