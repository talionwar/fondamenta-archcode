# FONDAMENTA — Product Requirements Document

> **Zero-dependency codebase intelligence for AI agents and humans.**
> Automated static analysis → structured Markdown → readable by any LLM.

## Vision

Every AI coding tool (Claude Code, Cursor, Copilot, Windsurf) needs codebase context to work effectively. Current solutions require graph databases, MCP servers, or cloud services. FONDAMENTA takes a radically simpler approach: **static analysis → Markdown files → committed to your repo**.

The output is readable by any LLM without special tools, queryable with grep, and reviewable in any PR. Zero runtime dependencies.

## Problem

| Pain Point | Current Solutions | FONDAMENTA |
|------------|------------------|------------|
| AI doesn't understand project structure | GitNexus (KuzuDB + MCP), Repomix (single file dump) | Structured markdown, always in context |
| Setup friction | Install DB, run server, configure MCP | `npx fondamenta analyze` |
| Vendor lock-in | Requires specific AI tool integration | Works with ANY tool that reads files |
| Stale docs | Manual documentation rots | Re-run on CI or pre-commit |
| Black box output | Graph DB requires query language | Human-readable markdown |

## Target Users

1. **Solo developers** using AI coding assistants (Claude Code, Cursor, Copilot)
2. **Teams** that want AI-readable architecture docs in their repo
3. **Open-source maintainers** who want contributors to understand the codebase fast

## Architecture

```
┌─────────────────────────────────────────────┐
│                    CLI                       │
│  fondamenta analyze | diff | init | watch    │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│              Analyzer Core                   │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │TS Compiler│ │Framework │ │Schema Parser │ │
│  │   API     │ │Detector  │ │(Prisma/etc)  │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│       │             │              │          │
│  ┌────▼─────────────▼──────────────▼───────┐ │
│  │         Unified Graph (in-memory)        │ │
│  │  nodes: files, exports, components       │ │
│  │  edges: imports, uses, renders           │ │
│  └────────────────┬────────────────────────┘ │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│            Markdown Generators                │
│                                               │
│  pages │ components │ api-routes │ lib        │
│  schema-crossref │ component-graph            │
│  dependency-map │ playbook                    │
└───────────────────┬──────────────────────────┘
                    │
                    ▼
            .planning/dependencies/*.md
```

## Core Concepts

### 1. Unified In-Memory Graph

All source files are parsed into a single directed graph:

```typescript
interface Node {
  id: string;           // file path or symbol name
  type: NodeType;       // 'file' | 'component' | 'hook' | 'api-route' | 'lib' | 'model'
  metadata: Record<string, any>;  // framework-specific data
}

interface Edge {
  from: string;
  to: string;
  type: EdgeType;       // 'imports' | 'renders' | 'calls' | 'uses-model' | 'extends'
}
```

The graph is built once, held in memory, and queried by each generator. No persistence needed.

### 2. Framework Detection

Auto-detect project type from file structure and dependencies:

| Signal | Framework |
|--------|-----------|
| `app/` dir + `next.config.*` | Next.js App Router |
| `pages/` dir + `next.config.*` | Next.js Pages Router |
| `nuxt.config.*` | Nuxt 3 |
| `svelte.config.*` | SvelteKit |
| `remix.config.*` or `app/root.tsx` | Remix |
| `prisma/schema.prisma` | Prisma ORM |
| `drizzle.config.*` | Drizzle ORM |

### 3. Output Format

Each generator produces a standalone `.md` file with:
- **Metadata header**: generation date, file count, source
- **Table of Contents**: with anchor links
- **Entries**: one per file/component/route, with consistent fields
- **Cross-references**: "Used by" / "Imports" / "Depends on" links

## CLI Commands

### `fondamenta analyze [path]`

Full analysis of the project. Default: current directory.

```bash
npx fondamenta analyze
npx fondamenta analyze ./my-project
npx fondamenta analyze --output .fondamenta  # custom output dir
npx fondamenta analyze --framework nextjs     # force framework
```

**Output:** `.planning/` directory with all generated files.

**Options:**
- `--output, -o <dir>` — output directory (default: `.planning`)
- `--framework <name>` — force framework detection
- `--include <glob>` — additional files to include
- `--exclude <glob>` — files to exclude
- `--no-schema` — skip ORM schema analysis
- `--language <code>` — output language: `en` (default), `it`, `es`
- `--verbose` — show detailed progress

### `fondamenta diff`

Show what changed since last analysis. Useful in CI.

```bash
npx fondamenta diff                    # compare current vs last .planning/
npx fondamenta diff --since HEAD~3     # changes in last 3 commits
npx fondamenta diff --ci               # exit code 1 if outdated
```

### `fondamenta init`

Interactive setup. Creates config file and first analysis.

```bash
npx fondamenta init
```

Creates `fondamenta.config.ts`:

```typescript
import { defineConfig } from 'fondamenta';

export default defineConfig({
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
    playbook: true,
  },
  exclude: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
  schema: {
    provider: 'auto',  // 'prisma' | 'drizzle' | 'typeorm' | 'none'
  },
  ai: {
    generateClaudeMd: true,
    generateCursorRules: false,
    generateCopilotInstructions: false,
  },
});
```

### `fondamenta watch`

Watch mode — regenerate on file changes (debounced, incremental).

```bash
npx fondamenta watch
```

### `fondamenta ai-context`

Generate AI-specific context files:

```bash
npx fondamenta ai-context --claude     # append to CLAUDE.md
npx fondamenta ai-context --cursor     # generate .cursorrules
npx fondamenta ai-context --copilot    # generate .github/copilot-instructions.md
npx fondamenta ai-context --all        # all of the above
```

## Output Files

### Core Files (always generated)

| File | Content | Fields per entry |
|------|---------|-----------------|
| `DEPENDENCY-MAP.md` | High-level architecture overview | Areas, impact chains, test checklists |
| `dependencies/pages-atomic.md` | Every page/route | File, Type, Auth, Imports, Data Fetching, Components, Params, i18n |
| `dependencies/components-atomic.md` | Every component + hook | Props, State, Refs, API Calls, Side Effects, Used By |
| `dependencies/api-routes-atomic.md` | Every API endpoint | Method, Auth, Models, Input, Output, Side Effects, Rate Limit |
| `dependencies/lib-atomic.md` | Every utility/service | Exports, Imports, Used By, Key Logic, Env Vars |
| `dependencies/schema-crossref-atomic.md` | DB models + relations | Fields, Types, Constraints, Relations, Enums |
| `dependencies/component-graph.md` | Visual dependency tree | ASCII tree with inline annotations |

### Optional Files

| File | Content | When |
|------|---------|------|
| `DEVELOPMENT-PLAYBOOK.md` | Workflow rules, fragile zones | `--playbook` flag |
| `.cursorrules` snippet | Cursor-compatible context | `ai-context --cursor` |
| `CLAUDE.md` snippet | Claude Code context | `ai-context --claude` |

## Analysis Pipeline

### Phase 1: Discovery
1. Detect framework from `package.json` + file structure
2. Resolve `tsconfig.json` paths and aliases
3. Build file list (respecting `.gitignore` + config excludes)

### Phase 2: Parsing
4. Parse each `.ts`/`.tsx` file with TypeScript Compiler API
5. Extract: imports, exports, JSX usage, hooks, type annotations
6. Classify: page vs component vs hook vs lib vs API route

### Phase 3: Graph Construction
7. Build in-memory directed graph (nodes + edges)
8. Resolve cross-file references (follow import chains)
9. Detect component render trees (JSX → component edges)

### Phase 4: Schema Analysis
10. Parse ORM schema (Prisma, Drizzle, etc.)
11. Map models to API routes and data-fetching functions
12. Build model relationship graph

### Phase 5: Generation
13. Run each enabled generator against the graph
14. Write output files with consistent formatting
15. Generate metadata (timestamps, counts, checksums)

## Incremental Analysis

For `watch` mode and `diff`, track file hashes:

```json
// .planning/.fondamenta-state.json
{
  "version": "1.0.0",
  "analyzedAt": "2026-02-24T00:00:00Z",
  "files": {
    "app/page.tsx": { "hash": "abc123", "lastModified": "..." },
    ...
  }
}
```

On re-analysis:
1. Compare hashes → identify changed files
2. Re-parse only changed files
3. Update graph edges for affected nodes
4. Regenerate only affected sections in output files

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Language | TypeScript | Target audience uses TS, dogfood our own parser |
| Parser | `typescript` (compiler API) | Zero external deps, handles JSX, paths |
| CLI | `commander` | Industry standard, lightweight |
| Spinner | `ora` | Clean UX |
| Colors | `chalk` | Terminal output |
| Config | `lilconfig` + `jiti` | Load .ts/.js/.json config |
| Glob | `fast-glob` | Fast file discovery |
| Schema | Custom parsers per ORM | Avoid heavy ORM dependencies |
| Build | `tsup` | Fast bundling for npm package |
| Test | `vitest` | Fast, TS-native |

## Package Details

```json
{
  "name": "fondamenta",
  "description": "Zero-dependency codebase intelligence for AI agents. Static analysis → structured Markdown.",
  "bin": {
    "fondamenta": "./dist/cli.js"
  },
  "keywords": [
    "codebase-analysis", "ai-context", "claude-code", "cursor",
    "static-analysis", "dependency-graph", "architecture",
    "documentation", "nextjs", "typescript"
  ]
}
```

## Phases

### Phase 1 — MVP (publishable)
- [x] PRD
- [ ] CLI: `analyze` command
- [ ] Framework detection: Next.js App Router
- [ ] TypeScript parser: imports, exports, components, hooks
- [ ] Generators: pages, components, api-routes, lib, component-graph
- [ ] Prisma schema parser + schema-crossref generator
- [ ] Dependency map generator
- [ ] Config file support
- [ ] README with examples
- [ ] npm publish as `fondamenta`

### Phase 2 — Developer Experience
- [ ] `fondamenta diff` command
- [ ] `fondamenta watch` (incremental)
- [ ] `fondamenta ai-context` (Claude, Cursor, Copilot)
- [ ] `fondamenta init` interactive setup
- [ ] GitHub Action
- [ ] Pre-commit hook integration

### Phase 3 — Multi-Framework
- [ ] Next.js Pages Router
- [ ] Nuxt 3
- [ ] SvelteKit
- [ ] Remix
- [ ] Drizzle ORM
- [ ] TypeORM

### Phase 4 — Advanced
- [ ] Blast radius calculation (if you change X, what breaks?)
- [ ] Dead code detection
- [ ] Circular dependency detection
- [ ] Bundle impact estimation
- [ ] Multi-language (Python, Go)

## Differentiators vs Alternatives

| Feature | FONDAMENTA | GitNexus | Repomix | repo-to-text |
|---------|-----------|----------|---------|--------------|
| Output format | Structured Markdown | Graph DB (KuzuDB) | Single concatenated file | Single file |
| Runtime deps | None (static files) | KuzuDB + MCP server | None | None |
| Queryable | grep/read | Cypher queries via MCP | Read entire dump | Read entire dump |
| Incremental | Yes (hash-based) | Re-index | No | No |
| Framework-aware | Yes (routes, pages, layouts) | AST only | No | No |
| Schema-aware | Yes (Prisma, Drizzle) | No | No | No |
| AI-tool output | Claude, Cursor, Copilot | Claude Code (MCP) | Generic | Generic |
| Human-readable | Excellent (sections, TOC) | Requires tool | Poor (wall of text) | Poor |
| Git-friendly | Yes (meaningful diffs) | DB files | Single file diff | Single file diff |

## Success Metrics

- **npm downloads**: 1k/week within 3 months
- **GitHub stars**: 500 within 3 months
- **Framework support**: 3+ frameworks by Phase 3
- **Community**: 10+ contributors by Phase 3
