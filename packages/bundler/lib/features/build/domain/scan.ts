import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import type { ResolvedClassSelector } from '../BuildConfig';

/** An exported class the generated bundle registers. */
export interface DiscoveredClass {
  file: string;
  /** The name it is exported under; `default` for a default export. */
  exportName: string;
  /** The local name the generated bundle would like to import it under. */
  localName: string;
  /** The declared class name; an anonymous default export is named after its file. */
  className: string;
  isDefault: boolean;
  /** Names of the class's decorators, renamed imports resolved. */
  decorators: string[];
  /**
   * Plain-identifier first arguments of the class's decorators, e.g. the token in
   * `@repository(Token)`; an empty array when a decorator takes none. Syntax only:
   * used to warn when two classes pass the same identifier.
   */
  tokens: string[];
  /**
   * Each class decorator's name and the source text of its arguments, e.g.
   * `perPage` with `["'stations'"]`. Syntax only: lets the token-collision check
   * tell scope-gated classes (`@perPage('a')` vs `@perPage('b')`) apart.
   */
  decoratorCalls: { name: string; args: string[] }[];
}

const SOURCE_FILE = /\.(tsx?|mts|cts)$/;
const DECLARATION_FILE = /\.d\.[mc]?tsx?$/;

/** A TypeScript source file the bundler may parse: not a declaration file. */
export const isSourceFile = (file: string): boolean => SOURCE_FILE.test(file) && !DECLARATION_FILE.test(file);

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);

/** `@register`, `@register(...)`, `@ioc.register(...)` -> `register`; renamed imports map back to the imported name. */
function decoratorName(decorator: ts.Decorator, imports: Map<string, string>): string | undefined {
  const callee = ts.isCallExpression(decorator.expression) ? decorator.expression.expression : decorator.expression;
  if (ts.isIdentifier(callee)) return imports.get(callee.text) ?? callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  return undefined;
}

/**
 * `user-service.ts` -> `UserService`: the import name of an anonymous default-exported class.
 * File-name tags are not part of it: `user-service.production.ts` -> `UserService`.
 */
function nameFromFile(file: string): string {
  const words = path
    .basename(file)
    .split('.')[0]
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean);
  const name = words.map((w: string) => w[0].toUpperCase() + w.slice(1)).join('');
  return /^[A-Za-z_$]/.test(name) ? name : `_${name}`;
}

/**
 * The exported, non-abstract classes of one file that `selector` selects, in
 * declaration order. Syntax only: decorators are recognised by name, not by type.
 */
export function findClasses(
  file: string,
  selector: ResolvedClassSelector,
  text = readFileSync(file, 'utf8'),
): DiscoveredClass[] {
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

  const decoratorsOf = (node: ts.ClassDeclaration) =>
    (ts.getDecorators(node) ?? []).map((d) => decoratorName(d, imports)).filter((n): n is string => !!n);

  const decoratorCallsOf = (node: ts.ClassDeclaration): { name: string; args: string[] }[] =>
    (ts.getDecorators(node) ?? []).flatMap((d) => {
      const name = decoratorName(d, imports);
      if (!name) return [];
      const args = ts.isCallExpression(d.expression) ? d.expression.arguments.map((arg) => arg.getText(source)) : [];
      return [{ name, args }];
    });

  // A decorator's first argument, when it is a plain identifier, is usually the binding token:
  // `@repository(IDashboardRepositoryToken, singleton())`.
  const tokensOf = (node: ts.ClassDeclaration) =>
    (ts.getDecorators(node) ?? [])
      .map((d) => (ts.isCallExpression(d.expression) ? d.expression.arguments[0] : undefined))
      .filter((arg): arg is ts.Identifier => !!arg && ts.isIdentifier(arg))
      .map((arg) => arg.text);

  return exported
    .map(({ node, local, exportName }) => ({ node: node ?? (local ? classes.get(local) : undefined), exportName }))
    .filter((e): e is { node: ts.ClassDeclaration; exportName: string } => !!e.node)
    .map(({ node, exportName }) => ({
      node,
      exportName,
      className: node.name?.text ?? nameFromFile(file),
      decorators: decoratorsOf(node),
      decoratorCalls: decoratorCallsOf(node),
      tokens: tokensOf(node),
    }))
    .filter(({ node, exportName, className, decorators }) => {
      if (hasModifier(node, ts.SyntaxKind.AbstractKeyword)) return false;
      if (selector.export !== 'any' && (exportName === 'default') !== (selector.export === 'default')) return false;
      if (selector.decorators && !selector.decorators.some((name) => decorators.includes(name))) return false;
      if (selector.name && !selector.name.test(className)) return false;
      if (selector.excludeClasses?.includes(className)) return false;
      if (selector.excludeName?.test(className)) return false;
      return true;
    })
    .sort((a, b) => a.node.pos - b.node.pos)
    .map(({ exportName, className, decorators, decoratorCalls, tokens }) => ({
      file,
      exportName,
      localName: exportName === 'default' ? className : exportName,
      className,
      isDefault: exportName === 'default',
      decorators,
      decoratorCalls,
      tokens,
    }));
}
