import { DependencyKey, IContainer, ResolveOneOptions } from './IContainer';
import { constructor, isConstructor } from '../utils';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';

export type ContainerResolver = <T>(
  scope: IContainer,
  keyOrAlias: constructor<T> | DependencyKey,
  options?: ResolveOneOptions,
) => T;

export const DEFAULT_CONTAINER_RESOLVER = <T>(
  scope: IContainer,
  keyOrAlias: constructor<T> | DependencyKey,
  options?: ResolveOneOptions,
): T => {
  if (isConstructor(keyOrAlias)) {
    return scope.resolveByClass(keyOrAlias, options);
  }

  try {
    return scope.resolveOneByKey(keyOrAlias, options);
  } catch (e) {
    if (e instanceof DependencyNotFoundError) {
      return scope.resolveOneByAlias(keyOrAlias, options);
    }

    throw e;
  }
};
