import type { ProjectGraph, PageInfo } from '../types/index.js';
import { header, section, bullet, bulletList, anchor, tocEntry, type GeneratorContext } from './base.js';

export function generatePages(ctx: GeneratorContext): string {
  const { graph } = ctx;
  const pages = graph.pages;

  if (pages.length === 0) return '';

  // Group pages by top-level route
  const groups = groupByRoute(pages);
  const groupNames = Object.keys(groups).sort();

  let output = header('Pages — Atomic Analysis', ctx, pages.length, 'pages');

  // Table of Contents
  output += '## Table of Contents\n\n';
  let tocIndex = 1;
  for (const groupName of groupNames) {
    output += tocEntry(anchor(groupName), `${tocIndex}. ${groupName} (${groups[groupName].length})`);
    output += '\n';
    tocIndex++;
  }
  output += '\n---\n\n';

  // Generate each group
  let groupIndex = 1;
  for (const groupName of groupNames) {
    output += `${section(2, `${groupIndex}. ${groupName}`)}\n\n`;

    for (const page of groups[groupName]) {
      output += generatePageEntry(page);
      output += '\n';
    }

    groupIndex++;
  }

  return output;
}

function groupByRoute(pages: PageInfo[]): Record<string, PageInfo[]> {
  const groups: Record<string, PageInfo[]> = {};

  for (const page of pages) {
    const parts = page.routePath.split('/').filter(Boolean);
    const groupName = parts[0] || 'Root';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(page);
  }

  return groups;
}

function generatePageEntry(page: PageInfo): string {
  let output = `${section(3, `\`${page.routePath || '/'}\``)}\n\n`;

  output += `${bullet('File', `\`${page.filePath}\``)}\n`;
  output += `${bullet('Type', page.componentType === 'client' ? "Client Component (`'use client'`)" : 'Server Component')}\n`;
  output += `${bullet('Auth', page.auth)}\n`;

  // Imports
  const importLines = page.imports
    .filter((i) => !i.isTypeOnly)
    .map((i) => `\`${i.specifiers.join(', ')}\` from \`${i.source}\``);
  if (importLines.length > 0) {
    output += `${bulletList('Imports', importLines)}\n`;
  }

  // Data Fetching
  if (page.dataFetching.length > 0) {
    const fetchLines = page.dataFetching.map((d) => d.description);
    output += `${bulletList('Data Fetching', fetchLines)}\n`;
  }

  // Components
  if (page.components.length > 0) {
    output += `${bulletList('Components', page.components.map((c) => `\`${c}\``))}\n`;
  }

  // API Calls
  if (page.apiCalls.length > 0) {
    const callLines = page.apiCalls.map((c) => `\`${c.method} ${c.endpoint}\``);
    output += `${bulletList('API Calls', callLines)}\n`;
  }

  // Params
  if (page.params.length > 0) {
    output += `${bulletList('Params', page.params.map((p) => `\`${p}\``))}\n`;
  }

  // i18n
  if (page.i18nNamespace) {
    output += `${bullet('i18n', `\`${page.i18nNamespace}\``)}\n`;
  }

  output += '\n';
  return output;
}
