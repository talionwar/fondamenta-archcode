# Fondamenta ArchCode — Demo Project

> Showcases **all 20 features** of Fondamenta ArchCode with a realistic Next.js + Nuxt 3 project containing intentional issues.

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/talionwar/fondamenta-archcode.git
cd fondamenta-archcode/examples/demo-fullstack

# 2. Run static analysis
npx fondamenta-archcode analyze

# 3. Run code health agents
npx fondamenta-archcode agents --free --report
```

No `npm install` needed — Fondamenta analyzes source code statically.

## Actual Output

### `fondamenta analyze` (43 files, 127ms)

```
  Found:
    3 pages
    23 components/hooks
    4 API routes
    7 lib files
    5 DB models, 1 enums
```

Generated files in `.planning/`:
- `DEPENDENCY-MAP.md` — architecture overview, impact areas
- `dependencies/pages-atomic.md` — every page: imports, auth, data fetching
- `dependencies/components-atomic.md` — every component: props, state, hooks, used-by
- `dependencies/api-routes-atomic.md` — every API route: methods, auth, models
- `dependencies/lib-atomic.md` — every utility: exports, imports, env vars
- `dependencies/schema-crossref-atomic.md` — DB models, fields, relations (Prisma + Drizzle)
- `dependencies/component-graph.md` — visual dependency tree

### `fondamenta agents --free` (10 findings, 3ms)

```
  ✓ dead-code ..................... 7 findings (4 warnings, 3 info)
  ✓ circular-deps ................. 1 findings (1 warning)
  ✗ architecture-guard ............ 2 findings (1 error, 1 warning)

  10 findings: 1 error, 6 warnings, 3 info | 3 agents ran | 3ms
```

Key findings:
| Agent | Severity | Finding | File |
|-------|----------|---------|------|
| dead-code | warning | Orphan component `OrphanCard` | `components/OrphanCard.tsx` |
| dead-code | warning | Orphan lib (never imported) | `lib/unused-helper.ts` |
| dead-code | warning | Orphan lib (never imported) | `lib/payments.ts` |
| dead-code | warning | Orphan lib (never imported) | `lib/api-client.ts` |
| circular-deps | warning | 3-file cycle: A → B → C → A | `circular/module-a.ts` |
| architecture-guard | warning | God component (19 imports, threshold: 15) | `app/dashboard/page.tsx` |
| architecture-guard | error | Unprotected POST route with DB access | `app/api/orders/route.ts` |

## Feature → File → Finding Map

| # | Feature | Demo File(s) | Expected Finding |
|---|---------|-------------|-----------------|
| 1 | Analyze (App Router) | `app/`, `components/`, `lib/` | 43 files analyzed, 7 output files |
| 2 | Analyze (Pages Router) | N/A (Next.js App Router demo) | Framework detection |
| 3 | Prisma schema | `prisma/schema.prisma` | 5 models: User, Product, Order, OrderItem, Category |
| 4 | Drizzle schema | `src/db/schema.ts` | users, products, orders tables + statusEnum |
| 5 | Agent: dead-code | `components/OrphanCard.tsx`, `lib/unused-helper.ts` | Orphan component + orphan libs |
| 6 | Agent: circular-deps | `circular/module-a.ts → b → c → a` | 3-file import cycle |
| 7 | Agent: architecture-guard | `app/dashboard/page.tsx` (19 imports) | God component warning |
| 8 | Agent: security-scanner | `app/api/orders/route.ts` (no auth) | Unprotected mutation (PRO) |
| 9 | Agent: schema-drift | `lib/payments.ts` (uses `Payment` model) | Model not in schema (PRO) |
| 10 | Agent: performance-sentinel | `app/dashboard/page.tsx` (19 imports) | Heavy page (PRO) |
| 11 | Agent: convention-enforcer | `components/DashboardStats.tsx` (PascalCase) | Naming check (PRO) |
| 12 | Agent: impact-analyzer | `components/ui/Button.tsx` (high fan-in) | Hub component (PRO) |
| 13 | Watch mode | Run: `fondamenta watch` | Auto-regenerate on file changes |
| 14 | Diff mode | `.planning/.fondamenta-state.json` | `fondamenta diff` shows changes |
| 15 | AI context | `CLAUDE.md` (pre-generated) | AI-readable project summary |
| 16 | JSON output | `.planning/agents-output.json` | Machine-readable findings |
| 17 | CI mode | `.github/workflows/fondamenta.yml` | Exit code 1 if errors found |
| 18 | Nuxt 3 | `nuxt-app/` (pages, composables, server/api) | Framework auto-detection |
| 19 | --report | `.planning/AGENTS-REPORT.md` | Markdown report |
| 20 | Custom thresholds | `fondamenta.config.ts` | `maxDependencies: 12`, `maxPageImports: 15` |

## Intentional Issues

### Dead Code
- `components/OrphanCard.tsx` — never imported by any file
- `lib/unused-helper.ts` — exported functions never used
- `lib/payments.ts` — references `Payment` model not in schema
- `lib/api-client.ts` — client helper never imported

### Circular Dependencies
- `circular/module-a.ts` → `module-b.ts` → `module-c.ts` → `module-a.ts`

### Architecture Violations
- `app/dashboard/page.tsx` — 19 imports (threshold: 15) = god component
- `app/api/orders/route.ts` — POST with DB access, no `auth()` check
- `app/api/admin/stats/route.ts` — admin data without auth

### Schema Drift
- `lib/payments.ts` uses `prisma.payment.create()` but `Payment` model doesn't exist in `prisma/schema.prisma`

### Performance
- `app/dashboard/page.tsx` — heavy page with 19 imports
- `components/DashboardStats.tsx` — `'use client'` without hooks/state

## Project Structure

```
examples/demo-fullstack/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage
│   ├── layout.tsx                # Root layout
│   ├── dashboard/page.tsx        # Heavy page (19 imports)
│   ├── products/page.tsx         # Products page
│   └── api/
│       ├── products/route.ts     # GET+POST with auth ✓
│       ├── orders/route.ts       # POST without auth ✗
│       └── admin/stats/route.ts  # DB access without auth ✗
├── components/
│   ├── ui/ (11 components)       # Button, Card, Modal, Input...
│   ├── OrphanCard.tsx            # Dead code (never imported)
│   ├── GodComponent.tsx          # Too many dependencies
│   └── DashboardStats.tsx        # Unnecessary client component
├── lib/
│   ├── auth.ts, db.ts, utils.ts  # Core utilities
│   ├── payments.ts               # Schema drift (Payment model)
│   └── unused-helper.ts          # Dead code
├── circular/                     # Intentional cycle: A → B → C → A
├── prisma/schema.prisma          # 5 models (PostgreSQL)
├── src/db/schema.ts              # Drizzle ORM schema
├── nuxt-app/                     # Nuxt 3 sub-project
├── fondamenta.config.ts          # Custom thresholds
├── CLAUDE.md                     # AI context (auto-generated)
├── .github/workflows/fondamenta.yml  # CI integration
└── .planning/                    # Pre-generated analysis output
    ├── DEPENDENCY-MAP.md
    ├── AGENTS-REPORT.md
    ├── agents-output.json
    └── dependencies/ (6 atomic files)
```

## Configuration

```typescript
// fondamenta.config.ts
import { defineConfig } from 'fondamenta';

export default defineConfig({
  output: '.planning',
  framework: 'nextjs-app',
  agents: {
    thresholds: {
      maxLineCount: 400,
      maxDependencies: 12,
      maxPageImports: 15,
      maxApiCallsPerPage: 3,
    },
  },
  schema: { provider: 'auto' },
  exclude: ['**/node_modules/**', 'nuxt-app/**'],
});
```

## CI Integration

```yaml
# .github/workflows/fondamenta.yml
- name: Run code health check
  uses: talionwar/fondamenta-archcode@main
  with:
    command: 'agents --free --ci --report'
```

---

**[Fondamenta ArchCode](https://github.com/talionwar/fondamenta-archcode)** — Zero-dependency codebase intelligence for AI agents and humans.
