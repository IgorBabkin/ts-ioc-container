import React, { useEffect, useMemo } from 'react';
import type { Tag } from 'ts-ioc-container';
import { useScopeOrFail, ScopeContext } from './ScopeContext';

export interface ScopeProps {
  /**
   * Tags for the scope. Can be a comma-separated string or an array of tags.
   * @example tags="page,another-tag"
   * @example tags={['page', 'another-tag']}
   */
  tags: string | Tag[];
  children: React.ReactNode;
}

/**
 * Creates a child scope with the specified tags.
 * The scope is automatically disposed when the component unmounts.
 */
export function Scope({ tags, children }: ScopeProps) {
  const parentContainer = useScopeOrFail();

  // Normalize tags to array
  const tagsArray = useMemo(() => {
    if (typeof tags === 'string') {
      return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    }
    return tags;
  }, [tags]);

  const childScope = useMemo(
    () => parentContainer.createScope({ tags: tagsArray }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentContainer, tagsArray.join(',')],
  );

  useEffect(() => {
    return () => {
      childScope.dispose();
    };
  }, [childScope]);

  return <ScopeContext.Provider value={childScope}>{children}</ScopeContext.Provider>;
}
