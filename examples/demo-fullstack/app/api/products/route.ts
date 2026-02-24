import { auth } from '../../../lib/auth';
import { prisma } from '../../../lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const products = await prisma.product.findMany();
  return Response.json(products);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const product = await prisma.product.create({ data: body });
  return Response.json(product, { status: 201 });
}
