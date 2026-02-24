import type { ProjectGraph, LibInfo } from '../types/index.js';
import { header, section, bullet, bulletList, anchor, tocEntry, type GeneratorContext } from './base.js';

export function generateLib(ctx: GeneratorContext): string {
  const { graph } = ctx;
  const libs = graph.libs;

  if (libs.length === 0) return '';

  // Group by directory
  const groups = groupByDirectory(libs);
  const groupNames = Object.keys(groups).sort();

  let output = header('Lib / Utils — Atomic Analysis', ctx, libs.length, 'files');

  // Table of Contents
  output += '## Table of Contents\n\n';
  let tocIndex = 1;
  for (const name of groupNames) {
    output += tocEntry(anchor(name), `${tocIndex}. ${name} (${groups[name].length})`);
    output += '\n';
    tocIndex++;
  }
  output += '\n---\n\n';

  // Entries
  let groupIndex = 1;
  for (const name of groupNames) {
    output += `${section(2, `${groupIndex}. ${name}`)}\n\n`;

    for (const lib of groups[name]) {
      output += generateLibEntry(lib);
    }

    groupIndex++;
  }

  return output;
}

function groupByDirectory(libs: LibInfo[]): Record<string, LibInfo[]> {
  const groups: Record<string, LibInfo[]> = {};

  for (const lib of libs) {
    const parts = lib.filePath.split('/');
    const groupName = parts.slice(0, -1).join('/') || 'root';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(lib);
  }

  return groups;
}

function generateLibEntry(lib: LibInfo): string {
  const name = lib.filePath.split('/').pop()?.replace(/\.\w+$/, '') ?? lib.filePath;
  let output = `${section(3, `\`${name}\``)}\n\n`;

  output += `${bullet('File', `\`${lib.filePath}\``)}\n`;

  // Exports
  if (lib.exports.length > 0) {
    const exportLines = lib.exports.map((e) => {
      let line = `\`${e.name}\``;
      if (e.kind !== 'variable') line += ` (${e.kind})`;
      if (e.signature) line += `: ${e.signature}`;
      if (e.isTypeOnly) line += ' *type-only*';
      return line;
    });
    output += `${bulletList('Exports', exportLines)}\n`;
  }

  // Imports (non-type, non-node_modules)
  const relevantImports = lib.imports.filter((i) => !i.isTypeOnly && i.source.startsWith('.'));
  if (relevantImports.length > 0) {
    const importLines = relevantImports.map(
      (i) => `\`${i.specifiers.join(', ')}\` from \`${i.source}\``,
    );
    output += `${bulletList('Imports', importLines)}\n`;
  }

  // Used By
  if (lib.usedBy.length > 0) {
    output += `${bulletList('Used By', lib.usedBy.map((u) => `\`${u}\``))}\n`;
  }

  // Env Vars
  if (lib.envVars.length > 0) {
    output += `${bulletList('Env Vars', lib.envVars.map((v) => `\`${v}\``))}\n`;
  }

  // Side Effects
  if (lib.sideEffects.length > 0) {
    output += `${bulletList('Side Effects', lib.sideEffects)}\n`;
  }

  output += '\n';
  return output;
}
