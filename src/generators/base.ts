import type { ProjectGraph } from '../types/index.js';

export interface GeneratorContext {
  graph: ProjectGraph;
  projectName: string;
  generatedAt: string;
}

export function header(title: string, ctx: GeneratorContext, count: number, description: string): string {
  return `# ${title}

> **Project:** ${ctx.projectName}
> **Generated:** ${ctx.generatedAt}
> **Total:** ${count} ${description}
> **Tool:** [fondamenta](https://github.com/talionwar/fondamenta)

---

`;
}

export function tocEntry(anchor: string, label: string): string {
  return `- [${label}](#${anchor})`;
}

export function anchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function section(level: number, title: string): string {
  return `${'#'.repeat(level)} ${title}`;
}

export function bullet(label: string, value: string): string {
  if (!value || value === 'None') return '';
  return `- **${label}:** ${value}`;
}

export function bulletList(label: string, items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return `- **${label}:** ${items[0]}`;
  return `- **${label}:**\n${items.map((i) => `  - ${i}`).join('\n')}`;
}

export function codeBlock(content: string, lang = ''): string {
  return `\`\`\`${lang}\n${content}\n\`\`\``;
}

export function table(headers: string[], rows: string[][]): string {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map((r) => `| ${r.join(' | ')} |`);
  return [headerRow, separator, ...dataRows].join('\n');
}
