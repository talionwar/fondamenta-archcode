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
});
```

## Frameworks Supported

| Framework | Status |
|-----------|--------|
| Next.js App Router | ✅ Full support |
| Next.js Pages Router | Partial (detection + data fetching + API handlers) |
| Nuxt 3 | Partial (pages, composables, server API routes) |

**Planned:** SvelteKit, Remix

## How it works

1. **Discovers** files using `fast-glob` (respects `.gitignore`)
2. **Parses** TypeScript/TSX using the TypeScript Compiler API (not regex)
3. **Builds** an in-memory graph of imports, exports, components, hooks
4. **Classifies** each file: page, component, API route, lib, hook
5. **Analyzes** Prisma schema for models, fields, and relations
6. **Generates** structured Markdown with consistent formatting

Zero runtime dependencies after analysis — output is plain Markdown.

## vs Alternatives

| | Fondamenta ArchCode | GitNexus | Repomix |
|---|---|---|---|
| **Output** | Structured .md files | Graph DB (KuzuDB) | Single concatenated file |
| **Runtime deps** | None | KuzuDB + MCP server | None |
| **AI integration** | Any tool (reads files) | Claude Code only (MCP) | Any tool |
| **Framework-aware** | Yes (routes, pages, auth) | AST only | No |
| **Schema-aware** | Yes (Prisma + Drizzle) | No | No |
| **Code health agents** | Yes (8 agents) | No | No |
| **Human-readable** | Excellent | Requires queries | Poor (wall of text) |
| **Git-friendly** | Yes (meaningful diffs) | No (binary DB) | Poor (single file) |
| **Incremental** | Yes (watch + diff) | Re-index | No |

## Commands

| Command | Description |
|---------|-------------|
| `fondamenta analyze [path]` | Full codebase analysis → Markdown files |
| `fondamenta agents [path]` | Run code health agents on the project graph |
| `fondamenta diff [path]` | Show changes since last analysis |
| `fondamenta watch [path]` | Watch mode — regenerate on file changes |
| `fondamenta ai-context [path]` | Generate AI context files |
| `fondamenta init` | Create configuration file |

### `fondamenta agents`

Run 8 code health agents (3 free, 5 PRO) that analyze your project graph and produce actionable findings.

```bash
fondamenta agents              # All available agents
fondamenta agents --free       # Free agents only
fondamenta agents --agent dead-code  # Single agent
fondamenta agents --ci         # Exit code 1 if errors found
fondamenta agents --report     # Generate AGENTS-REPORT.md
fondamenta agents --list       # List all agents with tier
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

### `fondamenta diff`

```bash
fondamenta diff                # Show what changed
fondamenta diff --ci           # Exit code 1 if outdated (for CI)
```

### `fondamenta watch`

```bash
fondamenta watch               # Watch and regenerate on changes
fondamenta watch --debounce 1000  # Custom debounce (ms)
```

### `fondamenta ai-context`

```bash
fondamenta ai-context --claude    # Generate/update CLAUDE.md
fondamenta ai-context --cursor    # Generate .cursorrules
fondamenta ai-context --copilot   # Generate .github/copilot-instructions.md
fondamenta ai-context --all       # All of the above
```

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

## Known Limitations

- **Framework**: Next.js App Router fully supported. Pages Router and Nuxt 3 have partial support. SvelteKit and Remix planned.
- **Schema**: Prisma and Drizzle ORM supported. TypeORM planned.
- **Agent accuracy**: Dead code detection may flag Next.js convention files (layout.tsx, etc.) in edge cases. Use `--json` to filter results programmatically.
- **Test coverage**: 111 tests (14 unit suites + 2 integration suites). Contributions welcome.

## Roadmap

- [x] CLI `analyze` command
- [x] Next.js App Router support
- [x] Prisma schema analysis
- [x] 7 atomic generators + dependency map
- [x] `fondamenta watch` (incremental rebuild)
- [x] `fondamenta diff` (show changes since last analysis)
- [x] AI context generation (CLAUDE.md, .cursorrules, copilot instructions)
- [x] Code health agents (8 agents: 3 free + 5 PRO)
- [x] JSON output (--json) for CI/CD
- [x] Configurable agent thresholds
- [x] GitHub Action (CI + reusable action)
- [x] Next.js Pages Router support (partial: detection, data fetching, API handlers)
- [x] Test suite (111 tests: 14 unit + 2 integration)
- [x] Drizzle schema support (pgTable, mysqlTable, sqliteTable, relations, enums)
- [x] Nuxt 3 support (partial: pages, server/api, composables, auto-imports)
- [x] Watch/Diff agents integration (--agents flag)
- [ ] Next.js Pages Router full parity with App Router
- [ ] SvelteKit support
- [ ] Remix support

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
