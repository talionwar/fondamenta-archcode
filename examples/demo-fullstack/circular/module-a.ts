import { processB } from './module-b';

export function processA(data: string) {
  if (data.startsWith('b:')) return processB(data);
  return `A processed: ${data}`;
}
