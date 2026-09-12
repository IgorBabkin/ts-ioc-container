import { type DependencyKey } from '../container/IContainer';
import { type Branded } from './basic';
import { glob, type Glob, matchGlob, toSegments } from './glob';

/**
 * Where a dependency is resolved from: the module path a token was declared in -
 * usually `__dirname` (or `import.meta.dirname`) - followed by the dependency key.
 *
 * `new SingleToken('ILogger', { namespace: __dirname })` declared in
 * `/app/src/domain/user` has the namespace name `/app/src/domain/user/ILogger`.
 * That name travels in `ProviderOptions.namespace` and is what a provider's
 * namespace template is matched against, so a template can select by directory
 * (`/domain/**`), by key (`**\/ILogger`), or by both (`/domain/*\/ILogger`).
 */
export type Namespace = Branded<'Namespace', string>;

/**
 * A {@link Glob} over a {@link Namespace}, matched against the end of the
 * namespace name: a template needs no leading `**` to skip the absolute prefix
 * `__dirname` brings with it, so `/domain/*` matches `/app/src/domain/ILogger`.
 *
 * `*` stops at a segment boundary, exactly as in any other glob - use
 * `/domain/**` for everything below a directory, not `/domain/*`.
 */
export type NamespaceTemplate = Branded<'NamespaceTemplate', Glob>;

/**
 * Normalizes a module path into a namespace: `\` becomes `/`, repeated and
 * trailing separators collapse, and the result always starts with `/`.
 */
export const normalizeNamespace = (path: string): Namespace => `/${toSegments(path).join('/')}`;

/**
 * Composes a namespace name out of the module path a token was declared in and
 * the key it resolves.
 */
export const joinNamespace = (path: string, key: DependencyKey): Namespace =>
  `${normalizeNamespace(path)}/${key.toString()}`;

/**
 * Tells whether a namespace name is covered by a namespace template.
 */
export const matchNamespace = (template: NamespaceTemplate, namespace: Namespace): boolean =>
  // Prefixing with `**` is what makes a template match the end of the name rather than all of it.
  matchGlob(glob(`**/${template}`), namespace);
