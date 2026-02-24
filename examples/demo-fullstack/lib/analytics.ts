import { prisma, getProducts, getOrders } from './db';
import { formatCurrency, formatDate } from './utils';

export async function getAnalytics() {
  const products = await getProducts();
  const orders = await getOrders();

  return {
    totalProducts: products.length,
    totalOrders: orders.length,
    revenue: 89012,
    lastUpdated: new Date(),
    formatted: {
      revenue: formatCurrency(89012),
      date: formatDate(new Date()),
    },
  };
}
