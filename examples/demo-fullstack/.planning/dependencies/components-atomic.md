# Components — Atomic Analysis

> **Project:** demo-fullstack
> **Generated:** 2026-02-24
> **Total:** 23 entries (21 components, 2 hooks)
> **Tool:** [fondamenta](https://github.com/talionwar/fondamenta-archcode)

---

## Table of Contents

- [Hooks (2)](#hooks)
- [1. DashboardStats.tsx (1)](#dashboardstatstsx)
- [2. GodComponent.tsx (1)](#godcomponenttsx)
- [3. OrderForm.tsx (1)](#orderformtsx)
- [4. OrphanCard.tsx (1)](#orphancardtsx)
- [5. ProductCard.tsx (1)](#productcardtsx)
- [6. UserProfile.tsx (1)](#userprofiletsx)
- [7. app (2)](#app)
- [8. app/dashboard (1)](#appdashboard)
- [9. app/products (1)](#appproducts)
- [10. ui (11)](#ui)

---

## Hooks

### `useCart`

- **File:** `hooks/useCart.ts`
- **Type:** Server Component
- **Hooks:** `useState`

### `useCounter`

- **File:** `nuxt-app/composables/useCounter.ts`
- **Type:** Server Component

## 1. DashboardStats.tsx

### `DashboardStats`

- **File:** `components/DashboardStats.tsx`
- **Type:** Client Component
- **Used By:** `app/dashboard/page.tsx`

## 2. GodComponent.tsx

### `GodComponent`

- **File:** `components/GodComponent.tsx`
- **Type:** Server Component
- **Renders:**
  - `Card`
  - `Button`
  - `Modal`
  - `Input`
  - `Badge`
  - `Avatar`
  - `Spinner`
  - `Toast`
  - `Dropdown`
  - `Tabs`
  - `Table`
  - `ProductCard`
  - `OrderForm`
- **Used By:** `app/dashboard/page.tsx`

## 3. OrderForm.tsx

### `OrderForm`

- **File:** `components/OrderForm.tsx`
- **Type:** Server Component
- **Renders:**
  - `Input`
  - `Button`
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`

## 4. OrphanCard.tsx

### `OrphanCard`

- **File:** `components/OrphanCard.tsx`
- **Type:** Server Component

## 5. ProductCard.tsx

### `ProductCard`

- **File:** `components/ProductCard.tsx`
- **Type:** Server Component
- **Renders:**
  - `Card`
  - `Badge`
  - `Button`
- **Used By:**
  - `app/dashboard/page.tsx`
  - `app/page.tsx`
  - `app/products/page.tsx`
  - `components/GodComponent.tsx`

## 6. UserProfile.tsx

### `UserProfile`

- **File:** `components/UserProfile.tsx`
- **Type:** Server Component
- **Renders:**
  - `Card`
  - `Avatar`
  - `Button`
- **Used By:**
  - `app/dashboard/page.tsx`
  - `app/page.tsx`

## 7. app

### `RootLayout`

- **File:** `app/layout.tsx`
- **Type:** Server Component

### `HomePage`

- **File:** `app/page.tsx`
- **Type:** Server Component
- **Renders:**
  - `UserProfile`
  - `ProductCard`
  - `Button`
  - `Card`

## 8. app/dashboard

### `DashboardPage`

- **File:** `app/dashboard/page.tsx`
- **Type:** Server Component
- **Renders:**
  - `DashboardStats`
  - `Tabs`
  - `Table`
  - `Button`
  - `Modal`
  - `Input`
  - `OrderForm`
  - `GodComponent`
  - `Badge`
  - `Avatar`
  - `Spinner`
  - `Toast`
  - `Dropdown`
  - `ProductCard`
  - `Card`
  - `UserProfile`

## 9. app/products

### `ProductsPage`

- **File:** `app/products/page.tsx`
- **Type:** Server Component
- **Renders:** `ProductCard`

## 10. ui

### `Avatar`

- **File:** `components/ui/Avatar.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`
  - `components/UserProfile.tsx`

### `Badge`

- **File:** `components/ui/Badge.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`
  - `components/ProductCard.tsx`

### `Button`

- **File:** `components/ui/Button.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `app/page.tsx`
  - `components/GodComponent.tsx`
  - `components/OrderForm.tsx`
  - `components/ProductCard.tsx`
  - `components/UserProfile.tsx`

### `Card`

- **File:** `components/ui/Card.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `app/page.tsx`
  - `components/GodComponent.tsx`
  - `components/ProductCard.tsx`
  - `components/UserProfile.tsx`

### `Dropdown`

- **File:** `components/ui/Dropdown.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`

### `Input`

- **File:** `components/ui/Input.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`
  - `components/OrderForm.tsx`

### `Modal`

- **File:** `components/ui/Modal.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`

### `Spinner`

- **File:** `components/ui/Spinner.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`

### `Table`

- **File:** `components/ui/Table.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`

### `Tabs`

- **File:** `components/ui/Tabs.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`

### `Toast`

- **File:** `components/ui/Toast.tsx`
- **Type:** Server Component
- **Used By:**
  - `app/dashboard/page.tsx`
  - `components/GodComponent.tsx`

