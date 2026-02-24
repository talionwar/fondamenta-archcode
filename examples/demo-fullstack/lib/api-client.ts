const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const SECRET_KEY = process.env.API_SECRET_KEY;

export async function fetchApi(path: string, options?: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': SECRET_KEY || '',
      ...options?.headers,
    },
  });
}
