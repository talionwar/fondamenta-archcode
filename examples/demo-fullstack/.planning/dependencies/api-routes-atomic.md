# API Routes — Atomic Analysis

> **Project:** demo-fullstack
> **Generated:** 2026-02-24
> **Total:** 4 routes
> **Tool:** [fondamenta](https://github.com/talionwar/fondamenta-archcode)

---

## Table of Contents

- [1. app (3)](#app)
- [2. nuxt-app (1)](#nuxt-app)

---

## Summary

| Route | Methods | Auth | Models |
| --- | --- | --- | --- |
| `app/api/admin/stats/route.ts` | GET | None | user, order |
| `app/api/orders/route.ts` | POST, GET | None | order |
| `app/api/products/route.ts` | GET, POST | auth() | product |
| `nuxt-app/server/api/hello.ts` | ALL | None | - |

---

## 1. app

### `app/api/admin/stats/route.ts`

- **File:** `app/api/admin/stats/route.ts`
- **Methods:** `GET`

- **Models:**
  - `user`
  - `order`
- **Side Effects:**
  - DB: count
  - DB: aggregate

### `app/api/orders/route.ts`

- **File:** `app/api/orders/route.ts`
- **Methods:** `POST`, `GET`

- **Models:** `order`
- **Side Effects:**
  - DB: create
  - DB: findMany

### `app/api/products/route.ts`

- **File:** `app/api/products/route.ts`
- **Methods:** `GET`, `POST`
- **Auth:** auth()
- **Models:** `product`
- **Side Effects:**
  - DB: findMany
  - DB: create

## 2. nuxt-app

### `nuxt-app/server/api/hello.ts`

- **File:** `nuxt-app/server/api/hello.ts`
- **Methods:** `ALL`



---

## Cross-Cutting Analysis

### Auth Levels

| Auth Type | Count |
| --- | --- |
| None | 3 |
| auth() | 1 |

### Model Usage

| Model | Routes |
| --- | --- |
| `order` | 2 |
| `user` | 1 |
| `product` | 1 |

