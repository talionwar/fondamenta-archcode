import { processC } from './module-c';

export function processB(data: string) {
  if (data.startsWith('c:')) return processC(data);
  return `B processed: ${data}`;
}
