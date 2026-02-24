import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { ImportInfo, ExportInfo, ComponentType, StateInfo, ApiCallInfo } from '../types/index.js';

export interface ParsedVueFile {
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
}

export function parseVueFile(filePath: string, projectRoot: string): ParsedVueFile {
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = relative(projectRoot, filePath);

  // Extract <script setup> or <script> block
  const scriptContent = extractScriptBlock(content);

  // Extract <template> for component usage
  const templateContent = extractTemplateBlock(content);

  // Parse script with TypeScript
  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];
  const hooks: string[] = [];
  const stateVars: StateInfo[] = [];
  const apiCalls: ApiCallInfo[] = [];
  const envVars: string[] = [];
  const sideEffects: string[] = [];

  if (scriptContent) {
    const sourceFile = ts.createSourceFile(
      filePath.replace('.vue', '.ts'),
      scriptContent,
      ts.ScriptTarget.Latest,
      true,
    );

    // Extract imports
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
        const specifiers: string[] = [];
        const isTypeOnly = node.importClause?.isTypeOnly ?? false;

        if (node.importClause) {
          if (node.importClause.name) specifiers.push(node.importClause.name.text);
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const el of node.importClause.namedBindings.elements) {
                specifiers.push(el.name.text);
              }
            }
          }
        }

        imports.push({ source: moduleSpecifier, specifiers, isTypeOnly });
      }
    });

    // Extract composable usage (hooks)
    const composableMatches = scriptContent.matchAll(/\b(use[A-Z]\w+)\s*\(/g);
    for (const m of composableMatches) {
      hooks.push(m[1]);
    }

    // Extract state (ref, reactive)
    const refMatches = scriptContent.matchAll(/(?:const|let)\s+(\w+)\s*=\s*ref\(/g);
    for (const m of refMatches) {
      stateVars.push({ name: m[1] });
    }
    const reactiveMatches = scriptContent.matchAll(/(?:const|let)\s+(\w+)\s*=\s*reactive\(/g);
    for (const m of reactiveMatches) {
      stateVars.push({ name: m[1] });
    }

    // Extract API calls
    const fetchMatches = scriptContent.matchAll(/\$fetch\s*\(\s*[`'"](\/api\/[^`'"]*)[`'"]/g);
    for (const m of fetchMatches) {
      apiCalls.push({ endpoint: m[1], method: 'GET' });
    }
    const useFetchMatches = scriptContent.matchAll(/useFetch\s*\(\s*[`'"](\/api\/[^`'"]*)[`'"]/g);
    for (const m of useFetchMatches) {
      apiCalls.push({ endpoint: m[1], method: 'GET' });
    }

    // Extract env vars
    const envMatches = scriptContent.matchAll(/(?:process\.env|useRuntimeConfig\(\))\.(\w+)/g);
    for (const m of envMatches) {
      envVars.push(m[1]);
    }

    // Side effects
    if (scriptContent.includes('onMounted(')) sideEffects.push('onMounted');
    if (scriptContent.includes('onUnmounted(')) sideEffects.push('onUnmounted');
    if (scriptContent.includes('watch(')) sideEffects.push('watch');
    if (scriptContent.includes('watchEffect(')) sideEffects.push('watchEffect');
  }

  // Extract component usage from template
  const jsxElements: string[] = [];
  if (templateContent) {
    const componentMatches = templateContent.matchAll(/<([A-Z][a-zA-Z0-9]+)/g);
    for (const m of componentMatches) {
      jsxElements.push(m[1]);
    }
    // Also PascalCase to kebab-case components
    const kebabMatches = templateContent.matchAll(/<([a-z]+-[a-z-]+)/g);
    for (const m of kebabMatches) {
      // Convert kebab to PascalCase
      const pascal = m[1]
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
      jsxElements.push(pascal);
    }
  }

  // Classify
  const isPage = relativePath.startsWith('pages/') || relativePath.startsWith('src/pages/');
  const isApiRoute =
    relativePath.startsWith('server/api/') || relativePath.startsWith('src/server/api/');
  const isComponent =
    relativePath.startsWith('components/') || relativePath.startsWith('src/components/');
  const isHook =
    relativePath.startsWith('composables/') || relativePath.startsWith('src/composables/');
  const isLib =
    relativePath.startsWith('utils/') ||
    relativePath.startsWith('src/utils/') ||
    relativePath.startsWith('server/utils/') ||
    relativePath.startsWith('lib/');

  // In script setup, all top-level bindings are automatically exported
  if (scriptContent) {
    const fileName = relativePath.split('/').pop()?.replace(/\.\w+$/, '') || 'default';
    const name = fileName.charAt(0).toUpperCase() + fileName.slice(1);
    exports.push({ name, kind: 'default', isTypeOnly: false });
  }

  return {
    filePath,
    relativePath,
    imports,
    exports,
    componentType: 'server', // Vue in Nuxt is SSR by default
    isPage,
    isApiRoute,
    isComponent,
    isHook,
    isLib,
    hooks: [...new Set(hooks)],
    stateVars,
    apiCalls,
    envVars: [...new Set(envVars)],
    sideEffects,
    jsxElements: [...new Set(jsxElements)],
    rawContent: content,
  };
}

function extractScriptBlock(content: string): string | null {
  // Match <script setup lang="ts"> ... </script> or <script setup> ... </script>
  const setupMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
  if (setupMatch) return setupMatch[1].trim();

  // Fallback to regular <script>
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (scriptMatch) return scriptMatch[1].trim();

  return null;
}

function extractTemplateBlock(content: string): string | null {
  const match = content.match(/<template>([\s\S]*?)<\/template>/);
  return match ? match[1] : null;
}
