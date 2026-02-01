import type { DependencyKey, constructor } from 'ts-ioc-container';
import { InjectionToken } from 'ts-ioc-container';
import { useScopeOrFail } from './ScopeContext';

/**
 * Hook to resolve a dependency from the current scope.
 * @param token - The dependency key (string), token, or class constructor
 * @returns The resolved dependency instance
 * @example
 * ```tsx
 * // Using a string key
 * const service = useInject<IService>('IService');
 *
 * // Using a token
 * const service = useInject(ServiceToken);
 *
 * // Using a class constructor
 * const service = useInject(ServiceClass);
 * ```
 */
export function useInject<T>(token: DependencyKey | InjectionToken<T> | constructor<T>): T {
  const container = useScopeOrFail();

  // If it's an InjectionToken, use its resolve method
  if (token instanceof InjectionToken) {
    return token.resolve(container);
  }

  // Otherwise, use container.resolve directly
  return container.resolve<T>(token);
}
