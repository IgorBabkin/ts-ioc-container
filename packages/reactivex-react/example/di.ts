import { Container } from '@ibabkin/ts-ioc-container';
import { resolve } from '@ibabkin/ts-constructor-injector';

export function createRootContainer() {
    return new Container(
        {
            resolve(container, value, ...deps) {
                return resolve(container)(value, ...deps);
            },
        },
        { tags: ['root'] },
    );
}
