export const prisma = {
  user: { findMany: async () => [], count: async () => 0, create: async (d: any) => d },
  product: { findMany: async () => [], count: async () => 0, create: async (d: any) => d },
  order: { findMany: async () => [], count: async () => 0, create: async (d: any) => d, aggregate: async (d: any) => ({ _sum: { total: 0 } }) },
  category: { findMany: async () => [] },
} as any;

export async function getProducts() {
  return prisma.product.findMany();
}

export async function getOrders() {
  return prisma.order.findMany();
}
