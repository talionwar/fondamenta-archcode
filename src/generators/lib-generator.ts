import type { LibInfo, FondamentaConfig } from '../types/index.js';
import { header, section, bullet, bulletList, anchor, tocEntry, overrideNote, type GeneratorContext } from './base.js';

export function generateLib(ctx: GeneratorContext, config?: FondamentaConfig): string {
  const { graph } = ctx;
  const libs = graph.libs;

  if (libs.length === 0) return '';

  // Group by subsystem classification (if configured) or by directory
  const libClassification = config?.libClassification;
  const groups = libClassification
    ? groupByClassification(libs, libClassification)
    : groupByDirectory(libs);
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

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
      output += generateLibEntry(lib, ctx);
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

function groupByClassification(
  libs: LibInfo[],
  classification: Record<string, string>,
): Record<string, LibInfo[]> {
  const groups: Record<string, LibInfo[]> = {};
  // Sort prefixes longest-first for correct matching
  const prefixes = Object.keys(classification).sort((a, b) => b.length - a.length);

  for (const lib of libs) {
    let groupName = 'Other';
    for (const prefix of prefixes) {
      if (lib.filePath.startsWith(prefix)) {
        groupName = classification[prefix];
        break;
      }
    }
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(lib);
  }

  return groups;
}

function inferPurpose(lib: LibInfo): string {
  const fileName = lib.filePath.split('/').pop()?.replace(/\.\w+$/, '') ?? '';
  if (fileName.includes('service')) return `${fileName.replace(/-service$/, '')} service`;
  if (fileName.includes('client')) return `${fileName.replace(/-client$/, '')} client`;
  if (fileName.includes('parser')) return `${fileName.replace(/-parser$/, '')} parser`;
  if (fileName.includes('handler')) return `${fileName.replace(/-handler$/, '')} handler`;
  if (fileName.includes('utils')) return `${fileName.replace(/-utils$/, '')} utilities`;
  if (lib.exports.length > 0) {
    return `Exports: ${lib.exports.slice(0, 3).map((e) => e.name).join(', ')}`;
  }
  return '';
}

function generateLibEntry(lib: LibInfo, ctx: GeneratorContext): string {
  const name = lib.filePath.split('/').pop()?.replace(/\.\w+$/, '') ?? lib.filePath;
  let output = `${section(3, `\`${name}\``)}\n\n`;

  output += `${bullet('File', `\`${lib.filePath}\``)}\n`;

  // Purpose (inferred from filename)
  const purpose = inferPurpose(lib);
  if (purpose) {
    output += `${bullet('Purpose', purpose)}\n`;
  }

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

  output += overrideNote(ctx, lib.filePath);

  output += '\n';
  return output;
}
