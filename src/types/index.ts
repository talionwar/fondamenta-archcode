// --- Node types ---

export type NodeType =
  | 'page'
  | 'component'
  | 'hook'
  | 'api-route'
  | 'lib'
  | 'model'
  | 'enum'
  | 'type'
  | 'file';

export type EdgeType =
  | 'imports'
  | 'renders'
  | 'calls'
  | 'uses-model'
  | 'extends'
  | 'implements';

export type ComponentType = 'server' | 'client';

export interface GraphNode {
  id: string;
  type: NodeType;
  filePath: string;
  metadata: NodeMetadata;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface NodeMetadata {
  name: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  [key: string]: unknown;
}

// --- Import/Export ---

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isTypeOnly: boolean;
  resolvedPath?: string;
}

export interface ExportInfo {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'type' | 'interface' | 'enum' | 'default';
  isTypeOnly: boolean;
  signature?: string;
}

// --- Page analysis ---

export interface PageInfo {
  filePath: string;
  routePath: string;
  componentType: ComponentType;
  auth: string;
  imports: ImportInfo[];
  dataFetching: DataFetchInfo[];
  components: string[];
  apiCalls: ApiCallInfo[];
  params: string[];
  i18nNamespace?: string;
}

export interface DataFetchInfo {
  model: string;
  operation: string;
  description: string;
}

// --- Component analysis ---

export interface ComponentInfo {
  filePath: string;
  name: string;
  componentType: ComponentType;
  props: PropInfo[];
  state: StateInfo[];
  refs: string[];
  hooks: string[];
  apiCalls: ApiCallInfo[];
  sideEffects: string[];
  usedBy: string[];
  renders: string[];
}

export interface PropInfo {
  name: string;
  type: string;
  required: boolean;
}

export interface StateInfo {
  name: string;
  initialValue?: string;
}

// --- API Route analysis ---

export interface ApiRouteInfo {
  filePath: string;
  routePath: string;
  methods: string[];
  auth: string;
  models: string[];
  inputValidation?: string;
  responseShape?: string;
  sideEffects: string[];
}

export interface ApiCallInfo {
  endpoint: string;
  method: string;
}

// --- Lib analysis ---

export interface LibInfo {
  filePath: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  usedBy: string[];
  sideEffects: string[];
  envVars: string[];
  keyLogic?: string;
}

// --- Schema analysis ---

export interface SchemaModel {
  name: string;
  fields: SchemaField[];
  relations: SchemaRelation[];
}

export interface SchemaField {
  name: string;
  type: string;
  constraints: string[];
}

export interface SchemaRelation {
  field: string;
  target: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface SchemaEnum {
  name: string;
  values: string[];
}

// --- Graph ---

export interface ProjectGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  pages: PageInfo[];
  components: ComponentInfo[];
  apiRoutes: ApiRouteInfo[];
  libs: LibInfo[];
  schema: {
    models: SchemaModel[];
    enums: SchemaEnum[];
  };
}

// --- Config ---

export type Framework = 'nextjs-app' | 'nextjs-pages' | 'nuxt' | 'sveltekit' | 'remix' | 'auto';
export type SchemaProvider = 'prisma' | 'drizzle' | 'typeorm' | 'auto' | 'none';

export interface FondamentaConfig {
  output: string;
  framework: Framework;
  language: 'en' | 'it' | 'es';
  generators: {
    pages: boolean;
    components: boolean;
    apiRoutes: boolean;
    lib: boolean;
    schemaXref: boolean;
    componentGraph: boolean;
    dependencyMap: boolean;
  };
  exclude: string[];
  include: string[];
  schema: {
    provider: SchemaProvider;
  };
  ai: {
    generateClaudeMd: boolean;
    generateCursorRules: boolean;
    generateCopilotInstructions: boolean;
  };
}

export const DEFAULT_CONFIG: FondamentaConfig = {
  output: '.planning',
  framework: 'auto',
  language: 'en',
  generators: {
    pages: true,
    components: true,
    apiRoutes: true,
    lib: true,
    schemaXref: true,
    componentGraph: true,
    dependencyMap: true,
  },
  exclude: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
  ],
  include: [],
  schema: {
    provider: 'auto',
  },
  ai: {
    generateClaudeMd: false,
    generateCursorRules: false,
    generateCopilotInstructions: false,
  },
};
