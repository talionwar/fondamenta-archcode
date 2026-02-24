import { prisma } from './db';

export async function processPayment(orderId: string, amount: number) {
  // Payment model referenced but not in Prisma schema
  const payment = await (prisma as any).payment.create({
    data: {
      orderId,
      amount,
      status: 'completed',
      processedAt: new Date(),
    },
  });
  return payment;
}

export async function getPaymentHistory(userId: string) {
  return (prisma as any).payment.findMany({
    where: { userId },
    orderBy: { processedAt: 'desc' },
  });
}
