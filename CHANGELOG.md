# Changelog

All notable changes to Fondamenta ArchCode are documented here.

## [0.3.0] - 2026-02-24

### Added
- **Code health agents system** — 8 agents (3 free, 5 PRO) for automated codebase analysis
  - Free: `dead-code`, `circular-deps`, `architecture-guard`
  - PRO: `security-scanner`, `schema-drift`, `performance-sentinel`, `convention-enforcer`, `impact-analyzer`
- **`fondamenta agents` command** with `--free`, `--agent <id>`, `--ci`, `--report`, `--list`, `--json` flags
- **JSON output** (`--json`) for CI/CD pipeline integration
- **Configurable agent thresholds** (`maxLineCount`, `maxDependencies`, `maxPageImports`, `maxApiCallsPerPage`)
- **PRO licensing system** — offline HMAC-based license validation
- **AGENTS-REPORT.md** generation with `--report` flag
- **`--agents` flag** for `diff` and `watch` commands to include agent findings
- **Drizzle ORM support** — parser using TypeScript Compiler API for `pgTable()`, `mysqlTable()`, `sqliteTable()`, enums, and relations
- **Nuxt 3 partial support** — pages, composables, server/api routes, auto-imports
- **Vue SFC parser** — extracts `<script setup>`, composable usage, `ref()`/`reactive()` state, API calls, template component references
- **Next.js Pages Router partial support** — detection, `getServerSideProps`/`getStaticProps` data fetching, API handlers
- **GitHub Action** — reusable CI action (`talionwar/fondamenta-archcode@main`)
- **Test suite** — 111 tests across 16 files (14 unit + 2 integration suites)
- **Demo project** — pre-generated `.planning/` output showcasing all features

### Changed
- Graph nodes now store **relative paths** instead of absolute paths for portability across environments
- Reduced agent false positives: skip Next.js convention files (`layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, etc.) and Nuxt auto-import directories
- Package renamed to `fondamenta-archcode` on npm

## [0.2.0] - 2026-02-24

### Added
- **`fondamenta diff`** — show added, modified, removed files since last analysis
  - `--ci` flag exits with code 1 if analysis is outdated
- **`fondamenta watch`** — file watcher with debounce, regenerates on `.ts`/`.tsx` changes
- **`fondamenta ai-context`** — generate context files for AI tools
  - `--claude` → `CLAUDE.md` (project structure, key routes, DB models, fragile zones)
  - `--cursor` → `.cursorrules` (framework info, conventions, auth patterns)
  - `--copilot` → `.github/copilot-instructions.md` (project map, model listing)
  - `--all` → all of the above
- **State tracking** — `.planning/.state.json` with MD5 file hashes for incremental diff
- **Automation docs** — cron, git pre-commit hook examples

## [0.1.0] - 2026-02-24

### Added
- **`fondamenta analyze`** — full codebase analysis generating 7 structured Markdown files
- **7 atomic generators:**
  - `pages-atomic.md` — every page with imports, auth, data fetching, components, i18n
  - `components-atomic.md` — every component with props, state, hooks, API calls, used-by tracking
  - `api-routes-atomic.md` — every API route with methods, auth, models, side effects
  - `lib-atomic.md` — every utility with exports, imports, env vars, used-by
  - `schema-crossref-atomic.md` — all DB models, fields, constraints, relations, enums
  - `component-graph.md` — visual text-based dependency tree
  - `DEPENDENCY-MAP.md` — architecture overview, impact areas, test checklists
- **`fondamenta init`** — interactive config file generation
- **Framework auto-detection** with confidence scoring (Next.js App/Pages Router, Nuxt 3, SvelteKit, Remix)
- **Prisma schema parser** — models, fields, constraints, relations, enums
- **TypeScript Compiler API** for AST parsing (not regex)
- **Programmatic API** — full library export for use in custom tools
- **`defineConfig()`** helper for typed configuration
