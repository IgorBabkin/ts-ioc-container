import { createEffect, createMemo, type JSX } from 'solid-js';
import type { Tag } from 'ts-ioc-container';
import { useScopeOrFail, ScopeContext } from './ScopeContext';

export interface ScopeProps {
  /**
   * Tags for the scope. Can be a comma-separated string or an array of tags.
   * @example tags="page,another-tag"
   * @example tags={['page', 'another-tag']}
   */
  tags: string | Tag[];
  children: JSX.Element;
}

/**
 * Creates a child scope with the specified tags.
 * The scope is automatically disposed when the component unmounts.
 */
export function Scope(props: ScopeProps) {
  const parentContainer = useScopeOrFail();

  // Normalize tags to array
  const tagsArray = createMemo(() => {
    if (typeof props.tags === 'string') {
      return props.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return props.tags;
  });

  const childScope = createMemo(() => {
    const tags = tagsArray();
    return parentContainer.createScope({ tags });
  });

  createEffect(() => {
    const scope = childScope();
    return () => {
      scope.dispose();
    };
  });

  return <ScopeContext.Provider value={childScope()}>{props.children}</ScopeContext.Provider>;
}
