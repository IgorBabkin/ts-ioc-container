import { IContainer } from '../container/IContainer';
import { ExecutionContext } from './ExecutionContext';

export type Execution = <T extends ExecutionContext>(context: T) => void;

const createStore = () => new Map<string, Execution>();

export const hook =
  (key: string | symbol, fn: Execution): MethodDecorator =>
  (target, propertyKey) => {
    const hooks = Reflect.hasMetadata(key, target.constructor)
      ? Reflect.getMetadata(key, target.constructor)
      : createStore();
    hooks.set(propertyKey, fn);
    Reflect.defineMetadata(key, hooks, target.constructor); // eslint-disable-line @typescript-eslint/ban-types
  };

export function getHooks(target: object, key: string | symbol): Map<string, Execution> {
  return Reflect.hasMetadata(key, target.constructor) ? Reflect.getMetadata(key, target.constructor) : new Map();
}

export function hasHooks(target: object, key: string | symbol): boolean {
  return Reflect.hasMetadata(key, target.constructor);
}

export const executeHooks = <Context extends ExecutionContext>(
  target: object,
  key: string | symbol,
  {
    scope,
    createContext = (c) => c as Context,
  }: { scope: IContainer; createContext?: (c: ExecutionContext) => Context },
) => {
  for (const [methodName, execute] of getHooks(target, key)) {
    execute(createContext(new ExecutionContext(target, methodName, scope)));
  }
};
