import { processA } from './module-a';

export function processC(data: string) {
  if (data.startsWith('a:')) return processA(data);
  return `C processed: ${data}`;
}
