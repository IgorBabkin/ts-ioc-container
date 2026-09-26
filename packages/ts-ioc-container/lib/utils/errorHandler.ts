import { resolveConstructor } from '../metadata/target';

/** Receives the error with the class and method it came from. */
export type HandleErrorParams = (error: unknown, context: { target: string; method: string }) => void;

/** Method decorator: routes a rejection of the async method to `errorHandler` instead of throwing. */
export const handleAsyncError =
  (errorHandler: HandleErrorParams): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (e) {
        errorHandler(e, { target: resolveConstructor(target).name, method: propertyKey as string });
      }
    };
    return descriptor;
  };

/** Method decorator: routes a throw of the method to `errorHandler` instead of throwing. */
export const handleError =
  (errorHandler: HandleErrorParams): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      try {
        return originalMethod.apply(this, args);
      } catch (e) {
        errorHandler(e, { target: resolveConstructor(target).name, method: propertyKey as string });
      }
    };
    return descriptor;
  };
