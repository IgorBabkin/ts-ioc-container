import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import type { Select } from './config';

/** An exported class the generated module registers. */
export interface DiscoveredClass {
  file: string;
  /** The name it is exported under; `default` for a default export. */
  exportName: string;
  /** The local name the generated module would like to import it under. */
  localName: string;
}

export interface ClassFilter {
  select: Select;
  decorators: string[];
}

const SOURCE_FILE = /\.(tsx?|mts|cts)$/;
const DECLARATION_FILE = /\.d\.[mc]?tsx?$/;

/** Source files of `dir`, sorted by path so the generated output is stable across machines. */
export function listSourceFiles(dir: string, recursive: boolean, isExcluded: (file: string) => boolean): string[] {
  const files: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive && entry.name !== 'node_modules') walk(full);
      } else if (SOURCE_FILE.test(entry.name) && !DECLARATION_FILE.test(entry.name) && !isExcluded(full)) {
        files.push(full);
      }
    }
  };
  walk(dir);
  return files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);

/** `@register`, `@register(...)`, `@ioc.register(...)` -> `register`; renamed imports map back to the imported name. */
function decoratorName(decorator: ts.Decorator, imports: Map<string, string>): string | undefined {
  const callee = ts.isCallExpression(decorator.expression) ? decorator.expression.expression : decorator.expression;
  if (ts.isIdentifier(callee)) return imports.get(callee.text) ?? callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  return undefined;
}

/** `user-service.ts` -> `UserService`: the import name of an anonymous default-exported class. */
function nameFromFile(file: string): string {
  const words = path
    .basename(file)
    .replace(SOURCE_FILE, '')
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean);
  const name = words.map((w: string) => w[0].toUpperCase() + w.slice(1)).join('');
  return /^[A-Za-z_$]/.test(name) ? name : `_${name}`;
}

/**
 * The exported classes of one file that `filter` selects, in declaration order.
 * Syntax only: decorators are recognised by name, not by type.
 */
export function findClasses(file: string, filter: ClassFilter, text = readFileSync(file, 'utf8')): DiscoveredClass[] {
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, kind);

  const imports = new Map<string, string>(); // local name -> imported name
  const classes = new Map<string, ts.ClassDeclaration>();
  const exported: { node: ts.ClassDeclaration | undefined; local?: string; exportName: string }[] = [];

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) imports.set(el.name.text, (el.propertyName ?? el.name).text);
      }
    } else if (ts.isClassDeclaration(statement)) {
      if (statement.name) classes.set(statement.name.text, statement);
      if (hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
        const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
        exported.push({ node: statement, exportName: isDefault ? 'default' : statement.name!.text });
      }
    } else if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && !statement.isTypeOnly) {
      const clause = statement.exportClause;
      if (clause && ts.isNamedExports(clause)) {
        for (const el of clause.elements) {
          if (!el.isTypeOnly)
            exported.push({ node: undefined, local: (el.propertyName ?? el.name).text, exportName: el.name.text });
        }
      }
    } else if (ts.isExportAssignment(statement) && !statement.isExportEquals && ts.isIdentifier(statement.expression)) {
      exported.push({ node: undefined, local: statement.expression.text, exportName: 'default' });
    }
  }

  const isSelected = (node: ts.ClassDeclaration) => {
    if (hasModifier(node, ts.SyntaxKind.AbstractKeyword)) return false;
    if (filter.select === 'exported') return true;
    return (ts.getDecorators(node) ?? []).some((d) => filter.decorators.includes(decoratorName(d, imports) ?? ''));
  };

  return exported
    .map(({ node, local, exportName }) => ({ node: node ?? (local ? classes.get(local) : undefined), exportName }))
    .filter((e): e is { node: ts.ClassDeclaration; exportName: string } => !!e.node && isSelected(e.node))
    .sort((a, b) => a.node.pos - b.node.pos)
    .map(({ node, exportName }) => ({
      file,
      exportName,
      localName: exportName === 'default' ? (node.name?.text ?? nameFromFile(file)) : exportName,
    }));
}
