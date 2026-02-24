# Dependency Map

> **Project:** demo-fullstack
> **Generated:** 2026-02-24
> **Total:** 37 analyzed files
> **Tool:** [fondamenta](https://github.com/talionwar/fondamenta-archcode)

---

> **Golden Rule:** If you modify a file in one area, test ALL connected flows.

> **Framework:** auto

---

## Index

| File | Content | Count |
| --- | --- | --- |
| `pages-atomic.md` | Pages / Routes | 3 |
| `components-atomic.md` | Components & Hooks | 23 |
| `api-routes-atomic.md` | API Routes | 4 |
| `lib-atomic.md` | Libraries & Utils | 7 |
| `schema-crossref-atomic.md` | DB Models & Relations | 5 |
| `component-graph.md` | Visual Dependency Tree | - |

---

## Impact Areas

### Authentication & Authorization

- **Files:**
  - `lib/auth.ts`
  - `app/api/products/route.ts`
- **Impact:**
  - All authenticated pages
  - All protected API routes
  - Middleware

**Test Checklist:**
- [ ] Login flow works
- [ ] Protected routes redirect when unauthenticated
- [ ] API returns 401 for unauthorized requests

### Layout & Navigation

- **Files:** `app/layout.tsx`
- **Impact:**
  - All pages using this layout
  - Navigation links
  - Mobile responsive behavior

**Test Checklist:**
- [ ] Navigation works on desktop
- [ ] Navigation works on mobile
- [ ] Active states are correct

## Schema Dependencies

| Model | Used By Routes |
| --- | --- |
| `order` | `app/api/admin/stats/route.ts`, `app/api/orders/route.ts` |
| `user` | `app/api/admin/stats/route.ts` |
| `product` | `app/api/products/route.ts` |

