import type {
  ProjectGraph,
  FondamentaConfig,
  GraphNode,
  ComponentInfo,
  PageInfo,
  ApiRouteInfo,
  LibInfo,
  SchemaModel,
  SchemaEnum,
  NodeType,
  ExportInfo,
  ImportInfo,
} from '../src/types/index.js';
import { DEFAULT_CONFIG } from '../src/types/index.js';

/**
 * Helper to create a mock ProjectGraph from partial overrides.
 * Auto-creates nodes from components/pages/libs/apiRoutes if not explicitly provided.
 */
export function createMockGraph(overrides?: {
  nodes?: Array<[string, GraphNode]>;
  edges?: Array<{ from: string; to: string; type?: string }>;
  pages?: PageInfo[];
  components?: ComponentInfo[];
  apiRoutes?: ApiRouteInfo[];
  libs?: LibInfo[];
  schema?: { models: SchemaModel[]; enums: SchemaEnum[] };
}): ProjectGraph {
  const nodes = new Map<string, GraphNode>();

  // If nodes not explicitly provided, auto-create from typed arrays
  if (!overrides?.nodes) {
    const allPaths = new Set<string>();

    // Collect from components
    if (overrides?.components) {
      for (const comp of overrides.components) {
        allPaths.add(comp.filePath);
      }
    }

    // Collect from pages
    if (overrides?.pages) {
      for (const page of overrides.pages) {
        allPaths.add(page.filePath);
      }
    }

    // Collect from API routes
    if (overrides?.apiRoutes) {
      for (const route of overrides.apiRoutes) {
        allPaths.add(route.filePath);
      }
    }

    // Collect from libs
    if (overrides?.libs) {
      for (const lib of overrides.libs) {
        allPaths.add(lib.filePath);
      }
    }

    // Collect from edges (auto-create nodes for edge endpoints)
    if (overrides?.edges) {
      for (const edge of overrides.edges) {
        allPaths.add(edge.from);
        allPaths.add(edge.to);
      }
    }

    // Create nodes for all discovered paths
    for (const path of allPaths) {
      const type = inferNodeType(path);
      nodes.set(path, {
        id: path,
        type,
        filePath: path,
        metadata: {
          name: path.split('/').pop()?.replace(/\.\w+$/, '') || 'unknown',
          exports: [],
          imports: [],
        },
      });
    }
  } else {
    // Use provided nodes
    for (const [id, node] of overrides.nodes) {
      nodes.set(id, node);
    }
  }

  const edges = (overrides?.edges || []).map((e) => ({
    from: e.from,
    to: e.to,
    type: (e.type || 'imports') as any,
  }));

  const pages = overrides?.pages || [];
  const components = overrides?.components || [];
  const apiRoutes = overrides?.apiRoutes || [];
  const libs = overrides?.libs || [];
  const schema = overrides?.schema || { models: [], enums: [] };

  return {
    nodes,
    edges,
    pages,
    components,
    apiRoutes,
    libs,
    schema,
  };
}

function inferNodeType(path: string): NodeType {
  if (path.includes('/pages/') || path.includes('/app/')) {
    if (path.endsWith('/page.ts') || path.endsWith('/page.tsx')) return 'page';
    if (path.endsWith('/route.ts') || path.endsWith('/route.tsx')) return 'api-route';
  }
  if (path.includes('/api/')) return 'api-route';
  if (path.endsWith('hook.ts') || path.endsWith('use-') || /\/use[A-Z]/.test(path)) return 'hook';
  if (path.endsWith('.tsx') || /[A-Z]/.test(path.split('/').pop() || '')) return 'component';
  return 'lib';
}

/**
 * Create a mock GraphNode for testing.
 */
export function createMockNode(overrides?: {
  id?: string;
  type?: NodeType;
  filePath?: string;
  name?: string;
  exports?: ExportInfo[];
  imports?: ImportInfo[];
  lineCount?: number;
}): GraphNode {
  const id = overrides?.id || 'test-file.ts';
  return {
    id,
    type: overrides?.type || 'lib',
    filePath: overrides?.filePath || id,
    metadata: {
      name: overrides?.name || id.split('/').pop()?.replace(/\.\w+$/, '') || 'test',
      exports: overrides?.exports || [],
      imports: overrides?.imports || [],
      lineCount: overrides?.lineCount || 100,
    },
  };
}

/**
 * Create a mock ComponentInfo for testing.
 */
export function createMockComponent(overrides?: {
  filePath?: string;
  name?: string;
  componentType?: 'server' | 'client';
  usedBy?: string[];
  renders?: string[];
  hooks?: string[];
  state?: Array<{ name: string }>;
  apiCalls?: Array<{ endpoint: string; method: string }>;
  sideEffects?: string[];
}): ComponentInfo {
  return {
    filePath: overrides?.filePath || 'components/Test.tsx',
    name: overrides?.name || 'TestComponent',
    componentType: overrides?.componentType || 'server',
    props: [],
    state: overrides?.state || [],
    refs: [],
    hooks: overrides?.hooks || [],
    apiCalls: overrides?.apiCalls || [],
    sideEffects: overrides?.sideEffects || [],
    usedBy: overrides?.usedBy || [],
    renders: overrides?.renders || [],
  };
}

/**
 * Create a mock PageInfo for testing.
 */
export function createMockPage(overrides?: {
  filePath?: string;
  routePath?: string;
  componentType?: 'server' | 'client';
  auth?: string;
  imports?: ImportInfo[];
  components?: string[];
  apiCalls?: Array<{ endpoint: string; method: string }>;
}): PageInfo {
  return {
    filePath: overrides?.filePath || 'app/page.tsx',
    routePath: overrides?.routePath || '/',
    componentType: overrides?.componentType || 'server',
    auth: overrides?.auth || 'None',
    imports: overrides?.imports || [],
    dataFetching: [],
    components: overrides?.components || [],
    apiCalls: overrides?.apiCalls || [],
    params: [],
  };
}

/**
 * Create a mock ApiRouteInfo for testing.
 */
export function createMockApiRoute(overrides?: {
  filePath?: string;
  routePath?: string;
  methods?: string[];
  auth?: string;
  models?: string[];
  sideEffects?: string[];
}): ApiRouteInfo {
  return {
    filePath: overrides?.filePath || 'app/api/test/route.ts',
    routePath: overrides?.routePath || '/api/test',
    methods: overrides?.methods || ['GET'],
    auth: overrides?.auth || 'None',
    models: overrides?.models || [],
    sideEffects: overrides?.sideEffects || [],
  };
}

/**
 * Create a mock LibInfo for testing.
 */
export function createMockLib(overrides?: {
  filePath?: string;
  exports?: ExportInfo[];
  imports?: ImportInfo[];
  usedBy?: string[];
  sideEffects?: string[];
  envVars?: string[];
}): LibInfo {
  return {
    filePath: overrides?.filePath || 'lib/utils.ts',
    exports: overrides?.exports || [],
    imports: overrides?.imports || [],
    usedBy: overrides?.usedBy || [],
    sideEffects: overrides?.sideEffects || [],
    envVars: overrides?.envVars || [],
  };
}

/**
 * Export DEFAULT_CONFIG for test setup.
 */
export { DEFAULT_CONFIG };
