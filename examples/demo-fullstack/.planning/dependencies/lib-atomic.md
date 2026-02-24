# Lib / Utils — Atomic Analysis

> **Project:** demo-fullstack
> **Generated:** 2026-02-24
> **Total:** 7 files
> **Tool:** [fondamenta](https://github.com/talionwar/fondamenta-archcode)

---

## Table of Contents

- [1. lib (7)](#lib)

---

## 1. lib

### `analytics`

- **File:** `lib/analytics.ts`
- **Exports:** `getAnalytics` (function): () => void
- **Imports:**
  - `prisma, getProducts, getOrders` from `./db`
  - `formatCurrency, formatDate` from `./utils`
- **Used By:** `app/dashboard/page.tsx`

### `api-client`

- **File:** `lib/api-client.ts`
- **Exports:** `fetchApi` (function): (path: string, options: RequestInit) => void
- **Env Vars:**
  - `NEXT_PUBLIC_API_URL`
  - `API_SECRET_KEY`

### `auth`

- **File:** `lib/auth.ts`
- **Exports:**
  - `auth` (function): () => void
  - `getServerSession` (function): () => void
- **Used By:** `app/api/products/route.ts`

### `db`

- **File:** `lib/db.ts`
- **Exports:**
  - `prisma`
  - `getProducts` (function): () => void
  - `getOrders` (function): () => void
- **Used By:**
  - `app/api/admin/stats/route.ts`
  - `app/api/orders/route.ts`
  - `app/api/products/route.ts`
  - `app/dashboard/page.tsx`
  - `app/products/page.tsx`
  - `components/GodComponent.tsx`
  - `lib/analytics.ts`
  - `lib/payments.ts`
- **Side Effects:** DB: findMany

### `payments`

- **File:** `lib/payments.ts`
- **Exports:**
  - `processPayment` (function): (orderId: string, amount: number) => void
  - `getPaymentHistory` (function): (userId: string) => void
- **Imports:** `prisma` from `./db`

### `unused-helper`

- **File:** `lib/unused-helper.ts`
- **Exports:**
  - `unusedFunction` (function): () => void
  - `anotherUnused` (function): (x: number) => void

### `utils`

- **File:** `lib/utils.ts`
- **Exports:**
  - `formatCurrency` (function): (amount: number) => string
  - `formatDate` (function): (date: Date | string) => string
  - `slugify` (function): (text: string) => string
  - `truncate` (function): (text: string, maxLength: number) => string
  - `capitalize` (function): (text: string) => string
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`
  - `components/ProductCard.tsx`
  - `lib/analytics.ts`

