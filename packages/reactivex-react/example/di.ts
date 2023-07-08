import { Container, ReflectionInjector } from 'ts-ioc-container';

export function createRootContainer() {
    return new Container(new ReflectionInjector(), { tags: ['root'] });
}
