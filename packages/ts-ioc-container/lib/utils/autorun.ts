const METADATA_KEY = 'autorun';

interface AutorunContext {
  instance: object;
  methodName: string;
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
  createContext: (props: { instance: object; methodName: string }) => Context = (c) => c as Context,
) => {
  for (const [methodName, execute] of getAutorunHooks(target)) {
    execute(createContext({ instance: target, methodName }));
  }
};
