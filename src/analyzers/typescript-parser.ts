import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import type {
  ImportInfo,
  ExportInfo,
  ComponentType,
  StateInfo,
  ApiCallInfo,
} from '../types/index.js';

export interface ParsedFile {
  filePath: string;
  relativePath: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  componentType: ComponentType;
  isPage: boolean;
  isApiRoute: boolean;
  isComponent: boolean;
  isHook: boolean;
  isLib: boolean;
  hooks: string[];
  stateVars: StateInfo[];
  apiCalls: ApiCallInfo[];
  envVars: string[];
  sideEffects: string[];
  jsxElements: string[];
  rawContent: string;
  dataFetchingMethod?: 'getServerSideProps' | 'getStaticProps' | 'getStaticPaths' | 'getInitialProps';
}

export async function parseTypeScriptFile(
  filePath: string,
  projectRoot: string,
  compilerOptions?: ts.CompilerOptions,
): Promise<ParsedFile> {
  const content = await readFile(filePath, 'utf-8');
  const relativePath = relative(projectRoot, filePath);

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const imports = extractImports(sourceFile, filePath, compilerOptions);
  const exports = extractExports(sourceFile);
  const componentType = detectComponentType(content);
  const hooks = extractHooks(sourceFile);
  const stateVars = extractStateVars(sourceFile);
  const apiCalls = extractApiCalls(sourceFile);
  const envVars = extractEnvVars(content);
  const sideEffects = extractSideEffects(sourceFile);
  const jsxElements = extractJsxElements(sourceFile);

  // Detect Pages Router data fetching methods
  const dataFetchingMethod = exports.find((e) =>
    ['getServerSideProps', 'getStaticProps', 'getStaticPaths', 'getInitialProps'].includes(e.name),
  )?.name as ParsedFile['dataFetchingMethod'];

  return {
    filePath,
    relativePath,
    imports,
    exports,
    componentType,
    isPage: classifyAsPage(relativePath),
    isApiRoute: classifyAsApiRoute(relativePath),
    isComponent: classifyAsComponent(relativePath, exports),
    isHook: classifyAsHook(relativePath, exports),
    isLib: classifyAsLib(relativePath),
    hooks,
    stateVars,
    apiCalls,
    envVars,
    sideEffects,
    jsxElements,
    rawContent: content,
    dataFetchingMethod,
  };
}

function extractImports(
  sourceFile: ts.SourceFile,
  filePath: string,
  compilerOptions?: ts.CompilerOptions,
): ImportInfo[] {
  const imports: ImportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
      const specifiers: string[] = [];
      let isTypeOnly = node.importClause?.isTypeOnly ?? false;

      if (node.importClause) {
        // Default import
        if (node.importClause.name) {
          specifiers.push(node.importClause.name.text);
        }
        // Named imports
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const el of node.importClause.namedBindings.elements) {
              specifiers.push(el.name.text);
            }
          } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            specifiers.push(`* as ${node.importClause.namedBindings.name.text}`);
          }
        }
      }

      // Resolve relative paths with extension fallback
      let resolvedPath: string | undefined;
      if (moduleSpecifier.startsWith('.')) {
        const base = resolve(dirname(filePath), moduleSpecifier);
        if (existsSync(base)) {
          resolvedPath = base;
        } else {
          for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx']) {
            if (existsSync(base + ext)) {
              resolvedPath = base + ext;
              break;
            }
          }
          if (!resolvedPath) resolvedPath = base;
        }
      }

      imports.push({ source: moduleSpecifier, specifiers, isTypeOnly, resolvedPath });
    }
  });

  return imports;
}

function extractExports(sourceFile: ts.SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExported = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);

    if (!isExported) return;

    if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text ?? 'default';
      const params = node.parameters.map((p) => {
        const paramName = p.name.getText(sourceFile);
        const paramType = p.type ? p.type.getText(sourceFile) : 'any';
        return `${paramName}: ${paramType}`;
      });
      const returnType = node.type ? node.type.getText(sourceFile) : 'void';
      exports.push({
        name,
        kind: isDefault ? 'default' : 'function',
        isTypeOnly: false,
        signature: `(${params.join(', ')}) => ${returnType}`,
      });
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          exports.push({
            name: decl.name.text,
            kind: 'variable',
            isTypeOnly: false,
          });
        }
      }
    } else if (ts.isClassDeclaration(node) && node.name) {
      exports.push({
        name: node.name.text,
        kind: 'class',
        isTypeOnly: false,
      });
    } else if (ts.isInterfaceDeclaration(node)) {
      exports.push({
        name: node.name.text,
        kind: 'interface',
        isTypeOnly: true,
      });
    } else if (ts.isTypeAliasDeclaration(node)) {
      exports.push({
        name: node.name.text,
        kind: 'type',
        isTypeOnly: true,
      });
    } else if (ts.isEnumDeclaration(node)) {
      exports.push({
        name: node.name.text,
        kind: 'enum',
        isTypeOnly: false,
      });
    }
  });

  return exports;
}

function detectComponentType(content: string): ComponentType {
  return content.includes("'use client'") || content.includes('"use client"')
    ? 'client'
    : 'server';
}

function extractHooks(sourceFile: ts.SourceFile): string[] {
  const hooks = new Set<string>();

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text.startsWith('use')
    ) {
      hooks.add(node.expression.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...hooks];
}

function extractStateVars(sourceFile: ts.SourceFile): StateInfo[] {
  const stateVars: StateInfo[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'useState'
    ) {
      // Find the parent variable declaration
      let parent = node.parent;
      if (parent && ts.isArrayBindingPattern(parent)) {
        const elements = parent.elements;
        if (elements.length > 0 && ts.isBindingElement(elements[0])) {
          const name = elements[0].name.getText(sourceFile);
          const initialValue = node.arguments.length > 0
            ? node.arguments[0].getText(sourceFile)
            : undefined;
          stateVars.push({ name, initialValue });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return stateVars;
}

function extractApiCalls(sourceFile: ts.SourceFile): ApiCallInfo[] {
  const calls: ApiCallInfo[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const text = node.getText(sourceFile);
      // Match fetch('/api/...')
      const fetchMatch = text.match(/fetch\s*\(\s*[`'"](\/api\/[^`'"]*)[`'"]/);
      if (fetchMatch) {
        const methodMatch = text.match(/method\s*:\s*['"](GET|POST|PUT|DELETE|PATCH)['"]/);
        calls.push({
          endpoint: fetchMatch[1],
          method: methodMatch ? methodMatch[1] : 'GET',
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

function extractEnvVars(content: string): string[] {
  const envVars = new Set<string>();
  const regex = /process\.env\.(\w+)|process\.env\[['"](\w+)['"]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    envVars.add(match[1] || match[2]);
  }
  return [...envVars];
}

function extractSideEffects(sourceFile: ts.SourceFile): string[] {
  const effects: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === 'useEffect') effects.push('useEffect');
      if (name === 'useLayoutEffect') effects.push('useLayoutEffect');
    }

    // Detect prisma calls
    if (ts.isPropertyAccessExpression(node)) {
      const text = node.getText(sourceFile);
      if (text.match(/prisma\.\w+\.(findMany|findUnique|create|update|delete|upsert|count|aggregate)/)) {
        effects.push(`DB: ${text.split('.').slice(-1)[0]}`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...new Set(effects)];
}

function extractJsxElements(sourceFile: ts.SourceFile): string[] {
  const elements = new Set<string>();

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      // Only collect PascalCase (custom components), not HTML elements
      if (tagName[0] === tagName[0].toUpperCase() && tagName[0] !== tagName[0].toLowerCase()) {
        elements.add(tagName);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...elements];
}

// --- Classification helpers ---

function classifyAsPage(relativePath: string): boolean {
  // Next.js App Router pages
  if (relativePath.match(/app\/.*\/page\.(tsx?|jsx?)$/)) return true;
  if (relativePath.match(/app\/page\.(tsx?|jsx?)$/)) return true;
  // Next.js Pages Router
  if (relativePath.match(/pages\/.*\.(tsx?|jsx?)$/) && !relativePath.includes('/api/')) return true;
  return false;
}

function classifyAsApiRoute(relativePath: string): boolean {
  // Next.js App Router API
  if (relativePath.match(/app\/api\/.*\/route\.(tsx?|jsx?)$/)) return true;
  // Next.js Pages Router API
  if (relativePath.match(/pages\/api\/.*\.(tsx?|jsx?)$/)) return true;
  return false;
}

function classifyAsComponent(relativePath: string, exports: ExportInfo[]): boolean {
  if (relativePath.includes('components/')) return true;
  // Check if it exports something that looks like a component (PascalCase function)
  return exports.some(
    (e) =>
      (e.kind === 'function' || e.kind === 'default' || e.kind === 'variable') &&
      /^[A-Z]/.test(e.name) &&
      e.name !== 'GET' &&
      e.name !== 'POST' &&
      e.name !== 'PUT' &&
      e.name !== 'DELETE' &&
      e.name !== 'PATCH',
  );
}

function classifyAsHook(relativePath: string, exports: ExportInfo[]): boolean {
  const fileName = relativePath.split('/').pop() ?? '';
  if (fileName.startsWith('use')) return true;
  return exports.some((e) => e.name.startsWith('use') && e.kind === 'function');
}

function classifyAsLib(relativePath: string): boolean {
  if (relativePath.startsWith('lib/') || relativePath.startsWith('src/lib/')) return true;
  if (relativePath.startsWith('utils/') || relativePath.startsWith('src/utils/')) return true;
  return false;
}
