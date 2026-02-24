# Schema — Cross-Reference Analysis

> **Project:** demo-fullstack
> **Generated:** 2026-02-24
> **Total:** 5 models, 1 enums
> **Tool:** [fondamenta](https://github.com/talionwar/fondamenta-archcode)

---

## Table of Contents

- [1. Enums (1)](#enums)
- [2. Models (5)](#models)
- [3. Relationship Map](#relationship-map)

---

## 1. Enums

| Enum | Values |
| --- | --- |
| `OrderStatus` | `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED` |

## 2. Models

### `User`

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | `String` | primary key, @default(cuid() |
| `email` | `String` | unique |
| `name` | `String` | optional |
| `orders` | `Order` | array |
| `createdAt` | `DateTime` | @default(now() |
| `updatedAt` | `DateTime` | auto-updated |

**Relations:**
- `orders` → `Order` (one-to-many)

### `Product`

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | `String` | primary key, @default(cuid() |
| `name` | `String` | - |
| `description` | `String` | optional |
| `price` | `Float` | - |
| `stock` | `Int` | @default(0) |
| `category` | `Category` | optional |
| `categoryId` | `String` | optional |
| `orderItems` | `OrderItem` | array |
| `createdAt` | `DateTime` | @default(now() |

**Relations:**
- `category` → `Category` (one-to-one)
- `orderItems` → `OrderItem` (one-to-many)

### `Order`

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | `String` | primary key, @default(cuid() |
| `user` | `User` | - |
| `userId` | `String` | - |
| `items` | `OrderItem` | array |
| `total` | `Float` | - |
| `status` | `OrderStatus` | @default(PENDING) |
| `createdAt` | `DateTime` | @default(now() |

**Relations:**
- `user` → `User` (one-to-one)
- `items` → `OrderItem` (one-to-many)

### `OrderItem`

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | `String` | primary key, @default(cuid() |
| `order` | `Order` | - |
| `orderId` | `String` | - |
| `product` | `Product` | - |
| `productId` | `String` | - |
| `quantity` | `Int` | - |
| `price` | `Float` | - |

**Relations:**
- `order` → `Order` (one-to-one)
- `product` → `Product` (one-to-one)

### `Category`

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | `String` | primary key, @default(cuid() |
| `name` | `String` | unique |
| `products` | `Product` | array |

**Relations:**
- `products` → `Product` (one-to-many)


---

## 3. Relationship Map

| From | Field | To | Type |
| --- | --- | --- | --- |
| `User` | `orders` | `Order` | one-to-many |
| `Product` | `category` | `Category` | one-to-one |
| `Product` | `orderItems` | `OrderItem` | one-to-many |
| `Order` | `user` | `User` | one-to-one |
| `Order` | `items` | `OrderItem` | one-to-many |
| `OrderItem` | `order` | `Order` | one-to-one |
| `OrderItem` | `product` | `Product` | one-to-one |
| `Category` | `products` | `Product` | one-to-many |

### Most Connected Models

| Model | Connections |
| --- | --- |
| `Order` | 4 |
| `Product` | 4 |
| `OrderItem` | 4 |
| `User` | 2 |
| `Category` | 2 |

