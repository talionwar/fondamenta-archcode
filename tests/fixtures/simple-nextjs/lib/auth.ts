export function auth() {
  return Promise.resolve({ user: { id: '1' } });
}

export function getSession() {
  return auth();
}
