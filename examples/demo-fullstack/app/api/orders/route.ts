import { prisma } from '../../../lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const order = await prisma.order.create({
    data: {
      ...body,
      status: 'pending',
    },
  });
  return Response.json(order, { status: 201 });
}

export async function GET() {
  const orders = await prisma.order.findMany({
    include: { items: true },
  });
  return Response.json(orders);
}
