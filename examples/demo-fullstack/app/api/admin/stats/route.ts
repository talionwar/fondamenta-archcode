import { prisma } from '../../../../lib/db';

export async function GET() {
  const userCount = await prisma.user.count();
  const orderCount = await prisma.order.count();
  const revenue = await prisma.order.aggregate({
    _sum: { total: true },
  });

  return Response.json({
    users: userCount,
    orders: orderCount,
    revenue: revenue._sum.total,
  });
}
