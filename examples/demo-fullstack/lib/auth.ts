export async function auth() {
  // Simulated auth check
  return { user: { id: '1', name: 'Demo User', email: 'demo@example.com' } };
}

export async function getServerSession() {
  return auth();
}
