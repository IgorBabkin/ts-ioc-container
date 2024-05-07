import { constructor } from './utils';
import { resolveArgs } from './injector/MetadataInjector';
import { IContainer } from './container/IContainer';

const METADATA_KEY = 'autorun';

export class AutorunContext {
  constructor(
    public instance: object,
    public methodName: string,
    public scope: IContainer,
  ) {}

  resolveArgs(...args: unknown[]): unknown[] {
    return resolveArgs(this.instance.constructor as constructor<unknown>, this.methodName)(this.scope, ...args);
  }

  invokeMethod({ args = this.resolveArgs() }: { args: unknown[] }): unknown {
    // @ts-ignore
    return this.instance[this.methodName](...args);
  }
}

type AutorunHandler = <T extends AutorunContext>(context: T) => void;

const createStore = () => new Map<string, AutorunHandler>();

export const autorun =
  (execute: AutorunHandler): MethodDecorator =>
  (target, propertyKey) => {
    const hooks = Reflect.hasMetadata(METADATA_KEY, target.constructor)
      ? Reflect.getMetadata(METADATA_KEY, target.constructor)
      : createStore();
    hooks.set(propertyKey, execute);
    Reflect.defineMetadata(METADATA_KEY, hooks, target.constructor);
  };

export const getAutorunHooks = (target: object): Map<string, AutorunHandler> => {
  return Reflect.hasMetadata(METADATA_KEY, target.constructor)
    ? Reflect.getMetadata(METADATA_KEY, target.constructor)
    : new Map();
};

export const startAutorun = <Context extends AutorunContext>(
  target: object,
  scope: IContainer,
  createContext: (c: AutorunContext) => Context = (c) => c as Context,
) => {
  for (const [methodName, execute] of getAutorunHooks(target)) {
    execute(createContext(new AutorunContext(target, methodName, scope)));
  }
};
