# Fondamenta Test Suite

Complete test suite for the Fondamenta TypeScript CLI, covering fixtures, helpers, unit tests, and integration tests.

## Directory Structure

```
tests/
├── fixtures/
│   ├── simple-nextjs/           # Next.js 14 fixture project
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── api/
│   │   │       └── users/
│   │   │           └── route.ts
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── OrphanWidget.tsx  # Orphan for dead-code tests
│   │   │   └── UserCard.tsx
│   │   ├── lib/
│   │   │   ├── auth.ts
│   │   │   └── unused-util.ts    # Orphan for dead-code tests
│   │   └── prisma/
│   │       └── schema.prisma
│   └── circular-deps/           # Circular dependency fixture
│       ├── tsconfig.json
│       ├── a.ts                 # Imports b
│       ├── b.ts                 # Imports c
│       └── c.ts                 # Imports a (creates cycle)
├── helpers.ts                   # Test utilities & mock factories
├── unit/
│   └── agents/
│       ├── dead-code.test.ts               # Dead code detector tests
│       ├── circular-deps.test.ts           # Circular deps detector tests
│       ├── architecture-guard.test.ts      # Architecture validation tests
│       ├── license.test.ts                 # License validation tests
│       ├── security-scanner.test.ts        # Security scanning tests (PRO)
│       ├── schema-drift.test.ts            # Schema drift detection tests (PRO)
│       ├── performance-sentinel.test.ts    # Performance analysis tests (PRO)
│       ├── convention-enforcer.test.ts     # Code convention tests (PRO)
│       └── impact-analyzer.test.ts         # Impact analysis tests (PRO)
└── integration/
    └── full-analysis.test.ts               # End-to-end analysis tests
```

## Test Coverage

### Unit Tests (8 agents)

#### Free Tier
- **dead-code.test.ts** — Dead Code Detector
  - Flags orphan components with empty usedBy
  - Skips Next.js implicit files (layout, loading, error, etc.)
  - Detects orphan libs
  - Skips barrel exports

- **circular-deps.test.ts** — Circular Dependencies
  - Detects 3-cycle A→B→C→A chains
  - Returns 0 findings for acyclic graphs
  - Reports error severity for 2-file cycles
  - Skips non-import edges
  - Deduplicates cycles

- **architecture-guard.test.ts** — Architecture Guard
  - Flags files over 500 lines
  - Detects unprotected mutation routes with DB access
  - Skips webhooks, cron, auth endpoints
  - Respects custom maxLineCount threshold
  - Validates auth requirements

- **license.test.ts** — License Validation
  - Returns free tier without key
  - Validates generated HMAC keys
  - Rejects invalid formats
  - Handles lifetime and expiring licenses
  - Detects tampered keys

#### Pro Tier
- **security-scanner.test.ts** — Security Scanner
  - Flags unauthenticated DB access
  - Detects shell execution imports
  - Validates env var exposure

- **schema-drift.test.ts** — Schema Drift Detector
  - Flags models used in code but missing from schema
  - Detects unused schema models
  - Skips framework models (Account, Session)
  - Handles PascalCase/lowercase matching

- **performance-sentinel.test.ts** — Performance Sentinel
  - Flags pages with too many imports
  - Detects unnecessary client components
  - Warns on API call waterfalls
  - Respects custom thresholds

- **convention-enforcer.test.ts** — Convention Enforcer
  - Flags inconsistent auth patterns
  - Validates kebab-case route names
  - Detects missing barrel exports
  - Skips app/ directories

- **impact-analyzer.test.ts** — Impact Analyzer
  - Identifies high fan-in nodes
  - Flags high fan-out nodes
  - Detects hub components
  - Finds bridge files
  - Skips .d.ts files

### Integration Test

**full-analysis.test.ts** — End-to-End Analysis
- Analyzes simple-nextjs fixture
- Detects pages, components, API routes
- Parses Prisma schema
- Runs all agents without error
- Verifies OrphanWidget detection
- Detects circular dependencies
- Validates agent summary counts
- Checks graph structure and edges
- Verifies component usage tracking

## Test Helpers (`tests/helpers.ts`)

Mock factory functions for building test graphs:

- `createMockGraph()` — Create ProjectGraph from partial overrides
- `createMockNode()` — Mock GraphNode
- `createMockComponent()` — Mock ComponentInfo
- `createMockPage()` — Mock PageInfo
- `createMockApiRoute()` — Mock ApiRouteInfo
- `createMockLib()` — Mock LibInfo

All functions auto-create nodes from typed arrays if not explicitly provided.

## Fixture Projects

### simple-nextjs
A realistic Next.js 14 project with:
- Root layout and home page
- Component library (Button, UserCard, OrphanWidget)
- API route with auth patterns
- Prisma schema (User/Post models)
- TypeScript configuration
- Both used and unused files for testing dead code detection

### circular-deps
A minimal fixture with a 3-file circular import chain:
- a.ts → b.ts → c.ts → a.ts
- Used to verify circular dependency detection

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- tests/unit/

# Run integration tests only
npm test -- tests/integration/

# Run specific test file
npm test -- tests/unit/agents/dead-code.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Test Architecture

### Mock Graph Creation Pattern

```typescript
const graph = createMockGraph({
  components: [
    createMockComponent({
      filePath: 'components/Test.tsx',
      usedBy: [],  // Triggers dead-code detection
    }),
  ],
});

const findings = deadCodeAgent.run(graph, DEFAULT_CONFIG);
```

### Agent Testing Pattern

All agent tests follow this pattern:
1. Create mock graph with specific conditions
2. Run agent on graph
3. Search findings for expected result
4. Verify severity, message, and suggestion

### Threshold Testing

Custom config thresholds override defaults:

```typescript
const customConfig = {
  ...DEFAULT_CONFIG,
  agents: {
    thresholds: { maxLineCount: 1000 },
  },
};
```

## Key Test Cases

### Dead Code
- Orphan components (no imports)
- Orphan libs (no usage)
- Skip Next.js implicit files
- Skip barrel exports

### Circular Dependencies
- Detect multi-file cycles
- Identify severity levels
- Deduplicate reports

### Architecture
- Oversized files
- Unprotected mutations
- God components
- Excluded patterns (webhooks, cron)

### Security
- Unauthenticated DB access
- Exposed env vars
- Shell execution imports

### Schema
- Missing models
- Unused definitions
- Framework model exceptions

### Performance
- Heavy pages
- Unnecessary client components
- API call waterfalls

### Conventions
- Inconsistent auth
- Non-kebab-case routes
- Missing barrel exports

### Impact
- High fan-in nodes
- Hub components
- Bridge files

## Notes

- All fixtures are minimal but realistic
- Tests use exact file paths matching Next.js conventions
- Mock graphs auto-create nodes to reduce boilerplate
- Fixtures are committed; don't modify without updating tests
- Tests are isolated; no external dependencies needed
