import type { ProjectGraph, PageInfo, ComponentInfo } from '../types/index.js';
import { header, section, type GeneratorContext } from './base.js';

export function generateComponentGraph(ctx: GeneratorContext): string {
  const { graph } = ctx;

  let output = header('Component Graph', ctx, graph.pages.length + graph.components.length, 'nodes');

  // Layout tree (find layout components)
  const layouts = graph.components.filter(
    (c) => c.name.toLowerCase().includes('layout') || c.filePath.includes('layout'),
  );

  if (layouts.length > 0) {
    output += `${section(2, '1. Layout Tree')}\n\n`;
    output += '```\n';
    for (const layout of layouts) {
      output += buildTree(layout.name, layout.renders, graph, 0, new Set());
    }
    output += '```\n\n';
  }

  // Page dependency trees
  output += `${section(2, '2. Page Dependencies')}\n\n`;

  for (const page of graph.pages) {
    output += `${section(3, `\`${page.routePath || '/'}\``)}\n\n`;
    output += '```\n';
    output += `${page.filePath}\n`;

    // Imports tree
    if (page.components.length > 0) {
      output += '  imports:\n';
      for (let i = 0; i < page.components.length; i++) {
        const isLast = i === page.components.length - 1;
        const prefix = isLast ? '  └── ' : '  ├── ';
        output += `${prefix}${page.components[i]}\n`;
      }
    }

    // Data dependencies
    if (page.dataFetching.length > 0) {
      output += `  data: ${page.dataFetching.map((d) => d.description).join(', ')}\n`;
    }

    output += '```\n\n';
  }

  return output;
}

function buildTree(
  name: string,
  renders: string[],
  graph: ProjectGraph,
  depth: number,
  visited: Set<string>,
): string {
  if (visited.has(name) || depth > 5) return '';
  visited.add(name);

  const indent = '  '.repeat(depth);
  let output = `${indent}${depth === 0 ? '' : '├── '}${name}\n`;

  // Find this component's renders
  const comp = graph.components.find((c) => c.name === name);
  if (comp) {
    for (const render of comp.renders) {
      output += buildTree(render, [], graph, depth + 1, visited);
    }
  } else {
    for (const render of renders) {
      output += buildTree(render, [], graph, depth + 1, visited);
    }
  }

  return output;
}
