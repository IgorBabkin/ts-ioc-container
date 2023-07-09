import { IAsyncMethodsMetadataCollector } from './IAsyncMethodsMetadataCollector';

export class AsyncMethodsMetadataCollector implements IAsyncMethodsMetadataCollector {
  constructor(readonly hookKey: string | symbol) {}

  // eslint-disable-next-line @typescript-eslint/ban-types
  addHook<GInstance extends Object>(target: GInstance, propertyKey: string | symbol): void {
    const targetId = AsyncMethodsMetadataCollector.getTargetId(target);
    const hooks = Reflect.getMetadata(this.hookKey, targetId) || [];
    Reflect.defineMetadata(this.hookKey, [...hooks, propertyKey], targetId);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async invokeHooksOf<GInstance extends Object>(target: GInstance, ...args: unknown[]): Promise<void> {
    const targetId = AsyncMethodsMetadataCollector.getTargetId(target);
    const hooks: string[] = Reflect.hasMetadata(this.hookKey, targetId)
      ? Reflect.getMetadata(this.hookKey, targetId)
      : [];

    for (const hookMethod of hooks) {
      await (target as any)[hookMethod](...args);
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private static getTargetId<GInstance extends Object = any>(target: GInstance): any {
    return target.constructor;
  }
}
