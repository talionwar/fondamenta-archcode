import { auth } from '../../../lib/auth';

export async function GET() {
  const session = await auth();
  return Response.json({ users: [] });
}

export async function POST(req: Request) {
  return Response.json({ created: true });
}
