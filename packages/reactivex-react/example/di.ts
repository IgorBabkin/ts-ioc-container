import { Container, MetadataInjector } from 'ts-ioc-container';

export function createRootContainer() {
  return new Container(new MetadataInjector(), { tags: ['root'] });
}
