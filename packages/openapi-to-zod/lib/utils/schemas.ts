import { OpenAPIV3 } from 'openapi-types';

type Schemas = NonNullable<OpenAPIV3.ComponentsObject['schemas']>;
type Node = Record<string, unknown>;

const SCHEMA_REF = '#/components/schemas/';

const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null && !Array.isArray(value);

const referencedSchema = (node: Node): string | undefined =>
  typeof node.$ref === 'string' && node.$ref.startsWith(SCHEMA_REF) ? node.$ref.slice(SCHEMA_REF.length) : undefined;

function collectReferences(node: unknown, into: Set<string>): Set<string> {
  if (Array.isArray(node)) {
    node.forEach((item) => collectReferences(item, into));
  } else if (isNode(node)) {
    const name = referencedSchema(node);
    if (name !== undefined) {
      into.add(name);
    }
    Object.values(node).forEach((value) => collectReferences(value, into));
  }
  return into;
}

// Dependencies first, so each `export const` only reads schemas that are already initialised.
function sortByReference(schemas: Schemas): string[] {
  const ordered: string[] = [];
  const visited = new Set<string>();
  const visit = (name: string) => {
    if (visited.has(name) || !(name in schemas)) {
      return;
    }
    visited.add(name);
    collectReferences(schemas[name], new Set()).forEach(visit);
    ordered.push(name);
  };
  Object.keys(schemas).forEach(visit);
  return ordered;
}

// Copies `node`, deferring every reference to a schema that is not yet declared (a cycle): the nearest
// enclosing object property becomes a getter (`x-getter`), which Zod 4 infers without annotations, and a
// reference outside any property is wrapped in `z.lazy` (`x-lazy`). `deferred` reports a back edge that
// still needs a property above it to become a getter.
function deferBackEdges(
  node: unknown,
  isBackEdge: (name: string) => boolean,
  underProperty: boolean,
): { node: unknown; deferred: boolean } {
  if (Array.isArray(node)) {
    const items = node.map((item) => deferBackEdges(item, isBackEdge, underProperty));
    return { node: items.map((item) => item.node), deferred: items.some((item) => item.deferred) };
  }
  if (!isNode(node)) {
    return { node, deferred: false };
  }
  const name = referencedSchema(node);
  if (name !== undefined && isBackEdge(name)) {
    return underProperty ? { node, deferred: true } : { node: { ...node, 'x-lazy': true }, deferred: false };
  }
  let deferred = false;
  const copy: Node = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'properties' && isNode(value)) {
      copy[key] = Object.fromEntries(
        Object.entries(value).map(([property, schema]) => {
          const result = deferBackEdges(schema, isBackEdge, true);
          return [
            property,
            result.deferred && isNode(result.node) ? { ...result.node, 'x-getter': true } : result.node,
          ];
        }),
      );
    } else {
      const result = deferBackEdges(value, isBackEdge, underProperty);
      copy[key] = result.node;
      deferred ||= result.deferred;
    }
  }
  return { node: copy, deferred };
}

// Returns `components.schemas` in an order that is safe to declare top to bottom, with the references
// that close a cycle marked for lazy evaluation. The input is not modified.
export function orderSchemas(schemas: Schemas): Schemas {
  const names = sortByReference(schemas);
  const position = new Map(names.map((name, index) => [name, index]));
  return Object.fromEntries(
    names.map((name, index) => {
      const isBackEdge = (target: string) => (position.get(target) ?? -1) >= index;
      return [name, deferBackEdges(schemas[name], isBackEdge, false).node as Schemas[string]];
    }),
  );
}
