export type HandleErrorParams = (error: unknown, context: { target: string; method: string }) => void;
export const handleAsyncError =
  (errorHandler: HandleErrorParams): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (e) {
        errorHandler(e, { target: (target as any).constructor.name, method: propertyKey as string });
      }
    };
    return descriptor;
  };

export const handleError =
  (errorHandler: HandleErrorParams): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      try {
        return originalMethod.apply(this, args);
      } catch (e) {
        errorHandler(e, { target: (target as any).constructor.name, method: propertyKey as string });
      }
    };
    return descriptor;
  };
