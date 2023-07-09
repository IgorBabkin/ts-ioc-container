import { constructor } from '../others';

export interface IDependencyContainer {
  registerValue(key: string | symbol, value: unknown): void;

  createScope(tags: string[]): IDependencyContainer;

  resolve<T>(key: constructor<T> | symbol): T;

  dispose(): void;

  onBeforeDispose(): Promise<void>;
}
