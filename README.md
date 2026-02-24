# Fondamenta ArchCode

**Zero-dependency codebase intelligence for AI agents and humans.**

Static analysis → structured Markdown → readable by any LLM. No graph database, no MCP server, no cloud service. Just `.md` files committed to your repo.

## Why?

Every AI coding tool (Claude Code, Cursor, Copilot) needs to understand your codebase. Current solutions require running servers or databases. Fondamenta ArchCode generates **structured Markdown files** that any LLM can read natively — no special tools needed.

```
npx fondamenta-archcode analyze
```

That's it. Your `.planning/` directory now contains a complete architectural analysis.

## What it generates

```
.planning/
├── DEPENDENCY-MAP.md              # Architecture overview, impact areas
└── dependencies/
    ├── pages-atomic.md            # Every page: imports, auth, data fetching
    ├── components-atomic.md       # Every component: props, state, hooks, used-by
    ├── api-routes-atomic.md       # Every API route: methods, auth, models
    ├── lib-atomic.md              # Every utility: exports, imports, env vars
    ├── schema-crossref-atomic.md  # DB models, fields, relations, enums
    └── component-graph.md         # Visual dependency tree
```

Each file is:
- **Human-readable** — open in any editor, review in any PR
- **AI-readable** — any LLM understands Markdown natively
- **Grep-friendly** — find anything with standard tools
- **Git-friendly** — meaningful diffs when your code changes

## Quick Start

```bash
# Analyze current project
npx fondamenta-archcode analyze

# Analyze specific directory
npx fondamenta-archcode analyze ./my-project

# Custom output directory
npx fondamenta-archcode analyze --output .docs

# Initialize config file
npx fondamenta-archcode init
```

## Sample Output

### pages-atomic.md

```markdown
### `/dashboard`

- **File:** `app/(dashboard)/dashboard/page.tsx`
- **Type:** Server Component
- **Auth:** auth()
- **Data Fetching:**
  - DB: findMany (courses)
  - DB: count (flashcards)
- **Components:** `CourseCard`, `StatsWidget`, `RecentActivity`
- **i18n:** `dashboard`
```

### api-routes-atomic.md

```markdown
### `/api/courses`

- **File:** `app/api/courses/route.ts`
- **Methods:** `GET`, `POST`
- **Auth:** auth()
- **Models:** `course`, `enrollment`
- **Side Effects:** DB: findMany, DB: create
```

### schema-crossref-atomic.md

```markdown
### `User`

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | `String` | primary key, @default(cuid()) |
| `email` | `String` | unique |
| `name` | `String` | optional |
| `courses` | `Course` | array |

**Relations:**
- `courses` → `Course` (one-to-many)
- `flashcards` → `Flashcard` (one-to-many)
```

## Configuration

Create `fondamenta.config.ts` (or run `npx fondamenta-archcode init`):

```typescript
import { defineConfig } from 'fondamenta';

export default defineConfig({
  output: '.planning',
  framework: 'auto',         // 'nextjs-app' | 'nextjs-pages' | 'nuxt' | 'sveltekit' | 'remix'
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
  exclude: ['**/node_modules/**', '**/*.test.*'],
  schema: {
    provider: 'auto',        // 'prisma' | 'drizzle' | 'none'
  },
  agents: {
    license: 'FA-PRO-...',   // PRO license key (optional)
    thresholds: {
      maxLineCount: 500,      // Flag files exceeding this
      maxDependencies: 20,    // Flag components with too many imports
      maxPageImports: 15,     // Flag pages with heavy imports
      maxApiCallsPerPage: 5,  // Flag pages calling too many APIs
    },
  },
});
```

## Commands

| Command | Description |
|---------|-------------|
| `fondamenta analyze [path]` | Full codebase analysis → Markdown files |
| `fondamenta agents [path]` | Run code health agents on the project graph |
| `fondamenta diff [path]` | Show changes since last analysis |
| `fondamenta watch [path]` | Watch mode — regenerate on file changes |
| `fondamenta ai-context [path]` | Generate AI context files |
| `fondamenta init` | Create configuration file |

### `fondamenta analyze`

```bash
fondamenta analyze                     # Current directory
fondamenta analyze ./my-project        # Specific path
fondamenta analyze --output .docs      # Custom output
fondamenta analyze --framework nuxt    # Force framework
fondamenta analyze --no-schema         # Skip ORM analysis
fondamenta analyze --verbose           # Show detailed progress
```

### `fondamenta agents`

Run 8 code health agents (3 free, 5 PRO) that analyze your project graph and produce actionable findings.

```bash
fondamenta agents                       # All available agents
fondamenta agents --free                # Free agents only
fondamenta agents --agent dead-code     # Single agent
fondamenta agents --ci                  # Exit code 1 if errors found
fondamenta agents --report              # Generate AGENTS-REPORT.md
fondamenta agents --list                # List all agents with tier
fondamenta agents --json                # JSON output for CI/CD pipelines
fondamenta agents --framework nextjs-app  # Force framework
```

**Free agents:**
| Agent | What it checks |
|-------|---------------|
| `dead-code` | Orphan components, unused exports, unreferenced lib files |
| `circular-deps` | Circular import chains (DFS cycle detection) |
| `architecture-guard` | Oversized files, god components, unprotected mutation routes |

**PRO agents** (license required):
| Agent | What it checks |
|-------|---------------|
| `security-scanner` | Auth gaps, env var leaks, insecure patterns |
| `schema-drift` | Code↔schema model mismatches |
| `performance-sentinel` | Heavy pages, unnecessary client components, API waterfalls |
| `convention-enforcer` | Naming, barrel exports, auth pattern consistency |
| `impact-analyzer` | Fan-in/out hotspots, hub components, bridge files |

#### JSON output

The `--json` flag outputs structured JSON for CI/CD integration:

```json
{
  "version": "0.3.0",
  "timestamp": "2026-02-24T12:00:00.000Z",
  "summary": {
    "totalFindings": 5,
    "errors": 1,
    "warnings": 3,
    "infos": 1,
    "agentsRan": 3,
    "agentsSkipped": 5,
    "totalDurationMs": 245
  },
  "results": [
    {
      "agentId": "dead-code",
      "tier": "free",
      "skipped": false,
      "durationMs": 82,
      "findings": [...]
    }
  ]
}
```

### `fondamenta diff`

```bash
fondamenta diff                # Show what changed
fondamenta diff --ci           # Exit code 1 if outdated (for CI)
fondamenta diff --agents       # Compare agent findings vs last report
```

State is tracked in `.planning/.state.json` using MD5 file hashes. The diff computes added, modified, removed, and unchanged files since the last `analyze` run.

### `fondamenta watch`

```bash
fondamenta watch                    # Watch and regenerate on changes
fondamenta watch --debounce 1000    # Custom debounce (ms)
fondamenta watch --agents           # Run agents after each regeneration
```

Watches `.ts` and `.tsx` files using `chokidar`. Ignores `node_modules`, `.next`, `dist`, and `.planning`.

### `fondamenta ai-context`

Generate context files for AI coding tools. Each file includes a project summary, key routes, DB models, and fragile zones (auth, layout, heavy models).

```bash
fondamenta ai-context --claude    # Generate/update CLAUDE.md
fondamenta ai-context --cursor    # Generate .cursorrules
fondamenta ai-context --copilot   # Generate .github/copilot-instructions.md
fondamenta ai-context --all       # All of the above
```

**What gets generated:**

| Target | File | Contents |
|--------|------|----------|
| `--claude` | `CLAUDE.md` | Project structure, key routes, DB models, fragile zones |
| `--cursor` | `.cursorrules` | Framework info, conventions, component split, auth patterns |
| `--copilot` | `.github/copilot-instructions.md` | Project map table, DB model listing |

If a `CLAUDE.md` already exists, fondamenta appends/replaces only the auto-generated section (marked with a header comment).

## Frameworks Supported

| Framework | Status | Auto-Detection |
|-----------|--------|----------------|
| Next.js App Router | Full support | `app/` dir + `next.config.*` |
| Next.js Pages Router | Partial (detection, data fetching, API handlers) | `pages/` dir + `next.config.*` |
| Nuxt 3 | Partial (pages, composables, server API routes) | `nuxt.config.*` |
| SvelteKit | Detection only | `svelte.config.js` |
| Remix | Detection only | `remix.config.js` or `app/root.tsx` |

Detection uses confidence scoring (0-100%) with multiple signals: directory structure, config files, and `package.json` dependencies.

## Schema / ORM Support

| ORM | Parser | What it extracts |
|-----|--------|-----------------|
| **Prisma** | Regex-based (`schema.prisma`) | Models, fields, types, constraints (`@id`, `@unique`, `@default`, `@map`, `@updatedAt`), relations (`@relation`), enums |
| **Drizzle** | TypeScript Compiler API | `pgTable()`, `mysqlTable()`, `sqliteTable()` definitions, field types, `pgEnum`/`mysqlEnum`, relations via second-pass resolution |
| TypeORM | Planned | — |

Set `schema.provider` in config to `'prisma'`, `'drizzle'`, `'auto'` (tries both), or `'none'`.

## Vue / Nuxt SFC Support

Fondamenta includes a dedicated Vue Single-File Component parser (`vue-parser.ts`) for Nuxt 3 projects:

- Extracts `<script setup>` and `<script>` blocks, parses with TypeScript Compiler API
- Detects composable usage (`useX()` patterns), `ref()`, `reactive()` state
- Extracts API calls (`$fetch`, `useFetch`) and environment variables (`useRuntimeConfig()`)
- Parses `<template>` for component usage (PascalCase and kebab-case)
- Classifies files by Nuxt conventions: `pages/`, `components/`, `composables/`, `server/api/`, `utils/`
- Tracks lifecycle hooks: `onMounted`, `onUnmounted`, `watch`, `watchEffect`

## Programmatic API

Use Fondamenta as a library in your own tools:

```typescript
import {
  analyzeProject,
  detectFramework,
  parsePrismaSchema,
  parseDrizzleSchema,
  parseVueFile,
  generateClaudeMd,
  generateCursorRules,
  generateCopilotInstructions,
  saveState,
  loadState,
  computeDiff,
  // Generators
  generatePages,
  generateComponents,
  generateApiRoutes,
  generateLib,
  generateSchema,
  generateComponentGraph,
  generateDependencyMap,
  // Agents
  ALL_AGENTS,
  runAgents,
  listAgents,
  getAgent,
  validateLicense,
  generateLicenseKey,
  generateAgentsReport,
  // Types
  type ProjectGraph,
  type PageInfo,
  type ComponentInfo,
  type ApiRouteInfo,
  type LibInfo,
  type SchemaModel,
  type FondamentaConfig,
  type AnalysisResult,
  type Agent,
  type AgentFinding,
  type AgentsRunSummary,
} from 'fondamenta-archcode';

// Analyze a project
const result = await analyzeProject('/path/to/project', config);
console.log(result.graph.pages.length); // number of pages found

// Run agents programmatically
const summary = runAgents(result.graph, config, { freeOnly: true });
console.log(summary.errors); // number of error-level findings

// Detect framework
const detection = await detectFramework('/path/to/project');
console.log(detection.framework, detection.confidence);
```

## How it works

1. **Discovers** files using `fast-glob` (respects `.gitignore`)
2. **Parses** TypeScript/TSX/Vue SFC using the TypeScript Compiler API (not regex)
3. **Builds** an in-memory graph of imports, exports, components, hooks
4. **Classifies** each file: page, component, API route, lib, hook
5. **Analyzes** ORM schema (Prisma via regex, Drizzle via TS Compiler API)
6. **Generates** structured Markdown with consistent formatting
7. **Saves** state (file hashes in `.state.json`) for incremental diff tracking

All paths in the graph are stored as relative paths for portability across environments.

Zero runtime dependencies after analysis — output is plain Markdown.

## Licensing

Fondamenta ArchCode uses an **Open Core** model:

| Tier | Agents | Price |
|------|--------|-------|
| **Free** | `dead-code`, `circular-deps`, `architecture-guard` | Free forever |
| **PRO** | All 8 agents + configurable thresholds | License required |

PRO license keys are validated offline using HMAC signatures. Set your key in `fondamenta.config.ts`:

```typescript
export default defineConfig({
  agents: {
    license: 'FA-PRO-...',
  },
});
```

Or via environment variable:

```bash
FONDAMENTA_LICENSE=FA-PRO-... fondamenta agents
```

## vs Alternatives

| | Fondamenta ArchCode | GitNexus | Repomix |
|---|---|---|---|
| **Output** | Structured .md files | Graph DB (KuzuDB) | Single concatenated file |
| **Runtime deps** | None | KuzuDB + MCP server | None |
| **AI integration** | Any tool (reads files) | Claude Code only (MCP) | Any tool |
| **Framework-aware** | Yes (routes, pages, auth) | AST only | No |
| **Schema-aware** | Yes (Prisma + Drizzle) | No | No |
| **Vue/Nuxt support** | Yes (SFC parser) | No | No |
| **Code health agents** | Yes (8 agents) | No | No |
| **Human-readable** | Excellent | Requires queries | Poor (wall of text) |
| **Git-friendly** | Yes (meaningful diffs) | No (binary DB) | Poor (single file) |
| **Incremental** | Yes (watch + diff) | Re-index | No |
| **Programmatic API** | Yes (full library export) | No | No |

## Automation

### Cron (recommended for servers)

```bash
# Regenerate every 6 hours
30 */6 * * * cd /path/to/project && fondamenta analyze > /dev/null 2>&1
```

### Git pre-commit hook

```bash
# .git/hooks/pre-commit
fondamenta analyze
git add .planning/
```

### GitHub Action

Use Fondamenta ArchCode in your CI pipeline:

```yaml
- name: Run code health check
  uses: talionwar/fondamenta-archcode@main
  with:
    command: 'agents --free --ci'
```

Or with custom options:

```yaml
- name: Full analysis
  uses: talionwar/fondamenta-archcode@main
  with:
    command: 'agents --free --ci --report'
    path: './my-app'
```

### CI/CD with JSON output

```yaml
- name: Run agents
  run: npx fondamenta-archcode agents --free --json > agents-report.json

- name: Check for errors
  run: npx fondamenta-archcode agents --free --ci
```

## Known Limitations

- **Framework**: Next.js App Router fully supported. Pages Router and Nuxt 3 have partial support. SvelteKit and Remix are detection-only.
- **Schema**: Prisma and Drizzle ORM supported. TypeORM planned.
- **Vue**: SFC parser handles `<script setup>` and `<script>` blocks. Complex `<script>` patterns (mixins, extends) may not be fully extracted.
- **Agent accuracy**: Dead code detection skips Next.js convention files (`layout.tsx`, `loading.tsx`, etc.) and Nuxt auto-imports. Edge cases may still produce false positives — use `--json` to filter results programmatically.
- **Test coverage**: 111 tests (14 unit suites + 2 integration suites).

## Roadmap

- [x] CLI `analyze` command
- [x] Next.js App Router support
- [x] Prisma schema analysis
- [x] 7 atomic generators + dependency map
- [x] `fondamenta watch` (incremental rebuild)
- [x] `fondamenta diff` (show changes since last analysis)
- [x] AI context generation (CLAUDE.md, .cursorrules, copilot instructions)
- [x] Code health agents (8 agents: 3 free + 5 PRO)
- [x] JSON output (`--json`) for CI/CD
- [x] Configurable agent thresholds
- [x] GitHub Action (CI + reusable action)
- [x] Next.js Pages Router support (partial: detection, data fetching, API handlers)
- [x] Test suite (111 tests: 14 unit + 2 integration)
- [x] Drizzle schema support (pgTable, mysqlTable, sqliteTable, relations, enums)
- [x] Nuxt 3 support (partial: pages, server/api, composables, auto-imports)
- [x] Vue SFC parser (script setup, template component extraction)
- [x] Watch/Diff agents integration (`--agents` flag)
- [x] Programmatic API (full library export)
- [x] Relative paths in graph nodes (portable output)
- [ ] Next.js Pages Router full parity with App Router
- [ ] SvelteKit full support
- [ ] Remix full support
- [ ] TypeORM schema parser

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
