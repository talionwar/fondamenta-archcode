import type { ProjectGraph, ComponentInfo } from '../types/index.js';
import { header, section, bullet, bulletList, anchor, tocEntry, type GeneratorContext } from './base.js';

export function generateComponents(ctx: GeneratorContext): string {
  const { graph } = ctx;
  const components = graph.components;

  if (components.length === 0) return '';

  // Separate hooks from components
  const hooks = components.filter((c) => c.name.startsWith('use'));
  const regularComponents = components.filter((c) => !c.name.startsWith('use'));

  // Group by directory
  const groups = groupByDirectory(regularComponents);
  const groupNames = Object.keys(groups).sort();

  let output = header(
    'Components — Atomic Analysis',
    ctx,
    components.length,
    `entries (${regularComponents.length} components, ${hooks.length} hooks)`,
  );

  // Table of Contents
  output += '## Table of Contents\n\n';
  if (hooks.length > 0) {
    output += tocEntry('hooks', `Hooks (${hooks.length})`);
    output += '\n';
  }
  let tocIndex = 1;
  for (const name of groupNames) {
    output += tocEntry(anchor(name), `${tocIndex}. ${name} (${groups[name].length})`);
    output += '\n';
    tocIndex++;
  }
  output += '\n---\n\n';

  // Hooks section
  if (hooks.length > 0) {
    output += `${section(2, 'Hooks')}\n\n`;
    for (const hook of hooks) {
      output += generateComponentEntry(hook);
    }
  }

  // Component sections
  let groupIndex = 1;
  for (const name of groupNames) {
    output += `${section(2, `${groupIndex}. ${name}`)}\n\n`;

    for (const comp of groups[name]) {
      output += generateComponentEntry(comp);
    }

    groupIndex++;
  }

  return output;
}

function groupByDirectory(components: ComponentInfo[]): Record<string, ComponentInfo[]> {
  const groups: Record<string, ComponentInfo[]> = {};

  for (const comp of components) {
    const parts = comp.filePath.split('/');
    // Use parent directory as group name
    let groupName: string;
    if (parts.includes('components')) {
      const compIdx = parts.indexOf('components');
      groupName = parts[compIdx + 1] ?? 'root';
    } else {
      groupName = parts.slice(0, -1).join('/') || 'root';
    }

    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(comp);
  }

  return groups;
}

function generateComponentEntry(comp: ComponentInfo): string {
  let output = `${section(3, `\`${comp.name}\``)}\n\n`;

  output += `${bullet('File', `\`${comp.filePath}\``)}\n`;
  output += `${bullet('Type', comp.componentType === 'client' ? 'Client Component' : 'Server Component')}\n`;

  // State
  if (comp.state.length > 0) {
    const stateLines = comp.state.map((s) => `\`${s.name}\`${s.initialValue ? ` = ${s.initialValue}` : ''}`);
    output += `${bulletList('Internal State', stateLines)}\n`;
  }

  // Hooks
  if (comp.hooks.length > 0) {
    output += `${bulletList('Hooks', comp.hooks.map((h) => `\`${h}\``))}\n`;
  }

  // API Calls
  if (comp.apiCalls.length > 0) {
    const callLines = comp.apiCalls.map((c) => `\`${c.method} ${c.endpoint}\``);
    output += `${bulletList('API Calls', callLines)}\n`;
  }

  // Renders
  if (comp.renders.length > 0) {
    output += `${bulletList('Renders', comp.renders.map((r) => `\`${r}\``))}\n`;
  }

  // Side Effects
  if (comp.sideEffects.length > 0) {
    output += `${bulletList('Side Effects', comp.sideEffects)}\n`;
  }

  // Used By
  if (comp.usedBy.length > 0) {
    output += `${bulletList('Used By', comp.usedBy.map((u) => `\`${u}\``))}\n`;
  }

  output += '\n';
  return output;
}
