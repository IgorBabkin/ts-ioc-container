import { constructor, Container, IContainer, MetadataInjector, Provider, Resolvable } from 'ts-ioc-container';
import { IDependencyContainer, Scope } from '../lib';

export function createContainer(): IContainer {
  return new Container(new MetadataInjector(), { tags: [Scope.Application] });
}

export class ContainerAdapter implements IDependencyContainer {
  constructor(private container: IContainer) {}

  createScope(tags: string[]): IDependencyContainer {
    return new ContainerAdapter(this.container.createScope(...tags));
  }

  dispose(): void {
    this.container.dispose();
  }

  registerValue(key: string | symbol, value: unknown): void {
    this.container.register(key, Provider.fromValue(value));
  }

  resolve<T>(key: constructor<T> | symbol): T {
    return this.container.resolve(key);
  }
}

export const scope = (l: Resolvable) => l;

// eslint-disable-next-line @typescript-eslint/ban-types
export type EmptyType = {};
