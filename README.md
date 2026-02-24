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
| Next.js App Router | Supported |
| Next.js Pages Router | Planned |
| Nuxt 3 | Planned |
| SvelteKit | Planned |
| Remix | Planned |

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
| **Schema-aware** | Yes (Prisma) | No | No |
| **Human-readable** | Excellent | Requires queries | Poor (wall of text) |
| **Git-friendly** | Yes (meaningful diffs) | No (binary DB) | Poor (single file) |
| **Incremental** | Yes (watch + diff) | Re-index | No |

## Commands

| Command | Description |
|---------|-------------|
| `fondamenta analyze [path]` | Full codebase analysis → Markdown files |
| `fondamenta diff [path]` | Show changes since last analysis |
| `fondamenta watch [path]` | Watch mode — regenerate on file changes |
| `fondamenta ai-context [path]` | Generate AI context files |
| `fondamenta init` | Create configuration file |

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

```yaml
- name: Update architecture docs
  run: npx fondamenta-archcode analyze
- name: Commit changes
  run: |
    git add .planning/
    git diff --staged --quiet || git commit -m "docs: update fondamenta analysis"
```

## Roadmap

- [x] CLI `analyze` command
- [x] Next.js App Router support
- [x] Prisma schema analysis
- [x] 7 atomic generators + dependency map
- [x] `fondamenta watch` (incremental rebuild)
- [x] `fondamenta diff` (show changes since last analysis)
- [x] AI context generation (`.cursorrules`, `CLAUDE.md`, copilot instructions)
- [ ] GitHub Action
- [ ] Multi-framework support (Nuxt, SvelteKit, Remix)
- [ ] Dead code detection
- [ ] Blast radius calculation

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
