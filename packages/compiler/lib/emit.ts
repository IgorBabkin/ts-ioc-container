import { renderProtocol } from './render';
import type { DiscoveredClass } from './scan';

export interface EmitInput {
  /** Name of the generated class. */
  name: string;
  /** Shown in the header: where the output came from. */
  configPath: string;
  namespaces: string[];
  classes: (DiscoveredClass & { specifier: string })[];
}

const RUNTIME_IMPORTS = ['IContainer', 'IContainerModule', 'IRegistration', 'Registration'];

/**
 * Renders the generated bundle — static imports, `registrations`, and the bundle applying them —
 * from its protocol, `protocols/Bundle.ts.hbs`. This function only prepares the data: unique local
 * names, and one import per file in file order.
 */
export function emitBundle({ name, configPath, namespaces, classes }: EmitInput): string {
  const taken = new Set([...RUNTIME_IMPORTS, 'registrations', name]);
  const uniqueName = (wanted: string) => {
    let candidate = wanted;
    for (let n = 2; taken.has(candidate); n++) candidate = `${wanted}_${n}`;
    taken.add(candidate);
    return candidate;
  };

  // One import statement per file, in file order.
  const byFile = new Map<string, { specifier: string; defaultName?: string; named: string[] }>();
  const bindings = classes.map((cls) => {
    const binding = uniqueName(cls.localName);
    const entry = byFile.get(cls.file) ?? { specifier: cls.specifier, named: [] };
    byFile.set(cls.file, entry);
    if (cls.exportName === 'default') entry.defaultName = binding;
    else entry.named.push(binding === cls.exportName ? binding : `${cls.exportName} as ${binding}`);
    return binding;
  });

  return renderProtocol('Bundle.ts.hbs', {
    configPath,
    namespaces,
    name,
    imports: [...byFile.values()],
    registrations: bindings,
  });
}
