import fg from 'fast-glob';
import { resolve, relative } from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import ts from 'typescript';
import { parseTypeScriptFile, type ParsedFile } from './typescript-parser.js';
import { parsePrismaSchema } from '../schema/prisma-parser.js';
import { detectFramework } from '../framework/detector.js';
import type {
  FondamentaConfig,
  ProjectGraph,
  PageInfo,
  ComponentInfo,
  ApiRouteInfo,
  LibInfo,
  GraphNode,
  GraphEdge,
  Framework,
} from '../types/index.js';

export interface AnalysisResult {
  graph: ProjectGraph;
  framework: Framework;
  totalFiles: number;
  duration: number;
}

export async function analyzeProject(
  projectRoot: string,
  config: FondamentaConfig,
): Promise<AnalysisResult> {
  const start = Date.now();

  // Detect framework
  let framework = config.framework;
  if (framework === 'auto') {
    const detection = await detectFramework(projectRoot);
    framework = detection.framework;
  }

  // Load tsconfig
  const compilerOptions = loadTsConfig(projectRoot);

  // Discover files
  const files = await discoverFiles(projectRoot, config);

  // Parse all files
  const parsedFiles = await parseAllFiles(files, projectRoot, compilerOptions);

  // Build graph
  const graph = buildGraph(parsedFiles, projectRoot, framework);

  return {
    graph,
    framework,
    totalFiles: parsedFiles.length,
    duration: Date.now() - start,
  };
}

function loadTsConfig(projectRoot: string): ts.CompilerOptions | undefined {
  const tsconfigPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, 'tsconfig.json');
  if (!tsconfigPath) return undefined;

  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) return undefined;

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectRoot);
  return parsed.options;
}

async function discoverFiles(
  projectRoot: string,
  config: FondamentaConfig,
): Promise<string[]> {
  const patterns = ['**/*.ts', '**/*.tsx'];
  const ignore = [
    ...config.exclude,
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
  ];

  const files = await fg(patterns, {
    cwd: projectRoot,
    absolute: true,
    ignore,
    followSymbolicLinks: false,
  });

  return files.sort();
}

async function parseAllFiles(
  files: string[],
  projectRoot: string,
  compilerOptions?: ts.CompilerOptions,
): Promise<ParsedFile[]> {
  const results: ParsedFile[] = [];

  for (const file of files) {
    try {
      const parsed = await parseTypeScriptFile(file, projectRoot, compilerOptions);
      results.push(parsed);
    } catch {
      // Skip unparseable files
    }
  }

  return results;
}

function buildGraph(
  parsedFiles: ParsedFile[],
  projectRoot: string,
  framework: Framework,
): ProjectGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const pages: PageInfo[] = [];
  const components: ComponentInfo[] = [];
  const apiRoutes: ApiRouteInfo[] = [];
  const libs: LibInfo[] = [];

  // Index all files by path for cross-referencing
  const fileIndex = new Map<string, ParsedFile>();
  for (const f of parsedFiles) {
    fileIndex.set(f.relativePath, f);
    fileIndex.set(f.filePath, f);
  }

  // Build "used by" reverse index
  const usedByIndex = new Map<string, Set<string>>();
  for (const file of parsedFiles) {
    for (const imp of file.imports) {
      if (imp.resolvedPath) {
        const relResolved = relative(projectRoot, imp.resolvedPath);
        if (!usedByIndex.has(relResolved)) {
          usedByIndex.set(relResolved, new Set());
        }
        usedByIndex.get(relResolved)!.add(file.relativePath);

        edges.push({
          from: file.relativePath,
          to: relResolved,
          type: imp.isTypeOnly ? 'imports' : 'imports',
        });
      }
    }
  }

  for (const file of parsedFiles) {
    const usedBy = [...(usedByIndex.get(file.relativePath) ?? [])];

    // Create graph node
    const nodeType = file.isPage
      ? 'page'
      : file.isApiRoute
        ? 'api-route'
        : file.isHook
          ? 'hook'
          : file.isComponent
            ? 'component'
            : 'lib';

    nodes.set(file.relativePath, {
      id: file.relativePath,
      type: nodeType,
      filePath: file.filePath,
      metadata: {
        name: file.exports[0]?.name ?? file.relativePath.split('/').pop()?.replace(/\.\w+$/, '') ?? '',
        exports: file.exports,
        imports: file.imports,
      },
    });

    // Classify and extract info
    if (file.isPage) {
      pages.push(buildPageInfo(file, framework));
    }

    if (file.isApiRoute) {
      apiRoutes.push(buildApiRouteInfo(file, framework));
    }

    if (file.isComponent || file.isHook) {
      components.push(buildComponentInfo(file, usedBy));
    }

    if (file.isLib) {
      libs.push(buildLibInfo(file, usedBy));
    }
  }

  // Parse schema
  const schema = { models: [] as any[], enums: [] as any[] };
  const prismaPath = resolve(projectRoot, 'prisma/schema.prisma');
  if (existsSync(prismaPath)) {
    try {
      const parsed = parsePrismaSchema(prismaPath);
      schema.models = parsed.models;
      schema.enums = parsed.enums;
    } catch {
      // Schema parsing is optional
    }
  }

  return { nodes, edges, pages, components, apiRoutes, libs, schema };
}

function filePathToRoute(relativePath: string, framework: Framework): string {
  let route = relativePath;

  if (framework === 'nextjs-app') {
    // app/(group)/path/page.tsx → /path
    route = route
      .replace(/^(src\/)?app/, '')
      .replace(/\/page\.(tsx?|jsx?)$/, '')
      .replace(/\/route\.(tsx?|jsx?)$/, '')
      .replace(/\([\w-]+\)\//g, ''); // Remove route groups
  } else if (framework === 'nextjs-pages') {
    route = route
      .replace(/^(src\/)?pages/, '')
      .replace(/\.(tsx?|jsx?)$/, '')
      .replace(/\/index$/, '');
  }

  return route || '/';
}

function buildPageInfo(file: ParsedFile, framework: Framework): PageInfo {
  const routePath = filePathToRoute(file.relativePath, framework);

  // Detect auth pattern
  let auth = 'None';
  if (file.rawContent.includes('auth()')) auth = 'auth()';
  else if (file.rawContent.includes('getServerSession')) auth = 'getServerSession';
  else if (file.rawContent.includes('useSession')) auth = 'useSession (client)';
  else if (file.rawContent.includes('redirect')) auth = 'redirect (conditional)';

  // Extract data fetching
  const dataFetching = file.sideEffects
    .filter((e) => e.startsWith('DB:'))
    .map((e) => ({
      model: '',
      operation: e.replace('DB: ', ''),
      description: e,
    }));

  // Detect i18n
  let i18nNamespace: string | undefined;
  const i18nMatch = file.rawContent.match(/useTranslations\(['"](\w+)['"]\)/);
  if (i18nMatch) i18nNamespace = i18nMatch[1];

  // Extract params
  const params: string[] = [];
  const searchParamsMatch = file.rawContent.match(/searchParams\??\.(\w+)/g);
  if (searchParamsMatch) {
    for (const m of searchParamsMatch) {
      const param = m.replace(/searchParams\??\./, '');
      params.push(param);
    }
  }

  return {
    filePath: file.relativePath,
    routePath,
    componentType: file.componentType,
    auth,
    imports: file.imports,
    dataFetching,
    components: file.jsxElements,
    apiCalls: file.apiCalls,
    params: [...new Set(params)],
    i18nNamespace,
  };
}

function buildApiRouteInfo(file: ParsedFile, framework: Framework): ApiRouteInfo {
  const routePath = filePathToRoute(file.relativePath, framework);

  // Detect HTTP methods from exports
  const methods = file.exports
    .filter((e) => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(e.name))
    .map((e) => e.name);

  if (methods.length === 0) methods.push('ALL');

  // Detect auth
  let auth = 'None';
  if (file.rawContent.includes('auth()')) auth = 'auth()';
  else if (file.rawContent.includes('getServerSession')) auth = 'getServerSession';

  // Detect models used
  const models: string[] = [];
  const prismaMatch = file.rawContent.matchAll(/prisma\.(\w+)\./g);
  for (const m of prismaMatch) {
    models.push(m[1]);
  }

  return {
    filePath: file.relativePath,
    routePath,
    methods,
    auth,
    models: [...new Set(models)],
    sideEffects: file.sideEffects,
  };
}

function buildComponentInfo(file: ParsedFile, usedBy: string[]): ComponentInfo {
  const name =
    file.exports.find((e) => /^[A-Z]/.test(e.name))?.name ??
    file.exports.find((e) => e.name.startsWith('use'))?.name ??
    file.relativePath.split('/').pop()?.replace(/\.\w+$/, '') ??
    'Unknown';

  // Extract props from first export function/component
  const props: { name: string; type: string; required: boolean }[] = [];

  return {
    filePath: file.relativePath,
    name,
    componentType: file.componentType,
    props,
    state: file.stateVars,
    refs: [],
    hooks: file.hooks,
    apiCalls: file.apiCalls,
    sideEffects: file.sideEffects,
    usedBy,
    renders: file.jsxElements,
  };
}

function buildLibInfo(file: ParsedFile, usedBy: string[]): LibInfo {
  return {
    filePath: file.relativePath,
    exports: file.exports,
    imports: file.imports,
    usedBy,
    sideEffects: file.sideEffects,
    envVars: file.envVars,
  };
}
