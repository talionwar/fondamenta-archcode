import type { ProjectGraph, Framework } from '../types/index.js';
import { header, section, table, bulletList, type GeneratorContext } from './base.js';

export function generateDependencyMap(ctx: GeneratorContext, framework: Framework): string {
  const { graph } = ctx;

  let output = header('Dependency Map', ctx, 0, '');

  // Replace the "0 " with actual count
  const totalNodes = graph.pages.length + graph.components.length + graph.apiRoutes.length + graph.libs.length;
  output = output.replace('**Total:** 0 ', `**Total:** ${totalNodes} analyzed files`);

  output += `> **Golden Rule:** If you modify a file in one area, test ALL connected flows.\n\n`;
  output += `> **Framework:** ${framework}\n\n`;
  output += '---\n\n';

  // Index table
  output += `${section(2, 'Index')}\n\n`;
  output += table(
    ['File', 'Content', 'Count'],
    [
      ['`pages-atomic.md`', 'Pages / Routes', String(graph.pages.length)],
      ['`components-atomic.md`', 'Components & Hooks', String(graph.components.length)],
      ['`api-routes-atomic.md`', 'API Routes', String(graph.apiRoutes.length)],
      ['`lib-atomic.md`', 'Libraries & Utils', String(graph.libs.length)],
      ['`schema-crossref-atomic.md`', 'DB Models & Relations', String(graph.schema.models.length)],
      ['`component-graph.md`', 'Visual Dependency Tree', '-'],
    ],
  );
  output += '\n\n---\n\n';

  // Impact areas
  output += `${section(2, 'Impact Areas')}\n\n`;

  // Group pages by common dependencies
  const areas = detectImpactAreas(graph);
  for (const area of areas) {
    output += `${section(3, area.name)}\n\n`;
    output += `${bulletList('Files', area.files.map((f) => `\`${f}\``))}\n`;
    output += `${bulletList('Impact', area.impacts)}\n`;

    if (area.testChecklist.length > 0) {
      output += '\n**Test Checklist:**\n';
      for (const check of area.testChecklist) {
        output += `- [ ] ${check}\n`;
      }
    }
    output += '\n';
  }

  // Schema dependency
  if (graph.schema.models.length > 0) {
    output += `${section(2, 'Schema Dependencies')}\n\n`;

    // Find which models are used by which routes
    const modelUsage: Record<string, string[]> = {};
    for (const route of graph.apiRoutes) {
      for (const model of route.models) {
        if (!modelUsage[model]) modelUsage[model] = [];
        modelUsage[model].push(route.routePath);
      }
    }

    if (Object.keys(modelUsage).length > 0) {
      output += table(
        ['Model', 'Used By Routes'],
        Object.entries(modelUsage)
          .sort((a, b) => b[1].length - a[1].length)
          .map(([model, routes]) => [
            `\`${model}\``,
            routes.map((r) => `\`${r}\``).join(', '),
          ]),
      );
      output += '\n\n';
    }
  }

  return output;
}

interface ImpactArea {
  name: string;
  files: string[];
  impacts: string[];
  testChecklist: string[];
}

function detectImpactAreas(graph: ProjectGraph): ImpactArea[] {
  const areas: ImpactArea[] = [];

  // Auth area
  const authFiles = [
    ...graph.libs.filter((l) => l.filePath.includes('auth')).map((l) => l.filePath),
    ...graph.apiRoutes.filter((r) => r.auth !== 'None').map((r) => r.filePath),
  ];
  if (authFiles.length > 0) {
    areas.push({
      name: 'Authentication & Authorization',
      files: authFiles.slice(0, 10),
      impacts: ['All authenticated pages', 'All protected API routes', 'Middleware'],
      testChecklist: ['Login flow works', 'Protected routes redirect when unauthenticated', 'API returns 401 for unauthorized requests'],
    });
  }

  // Layout area
  const layoutFiles = graph.components
    .filter((c) => c.name.toLowerCase().includes('layout') || c.name.toLowerCase().includes('sidebar') || c.name.toLowerCase().includes('nav'))
    .map((c) => c.filePath);
  if (layoutFiles.length > 0) {
    areas.push({
      name: 'Layout & Navigation',
      files: layoutFiles,
      impacts: ['All pages using this layout', 'Navigation links', 'Mobile responsive behavior'],
      testChecklist: ['Navigation works on desktop', 'Navigation works on mobile', 'Active states are correct'],
    });
  }

  // API area - group by shared models
  const modelGroups: Record<string, string[]> = {};
  for (const route of graph.apiRoutes) {
    for (const model of route.models) {
      if (!modelGroups[model]) modelGroups[model] = [];
      modelGroups[model].push(route.filePath);
    }
  }
  for (const [model, files] of Object.entries(modelGroups)) {
    if (files.length >= 3) {
      areas.push({
        name: `${model} Data Layer`,
        files,
        impacts: [`All routes using ${model}`, `Pages that display ${model} data`],
        testChecklist: [`CRUD operations for ${model} work`, `Validation is enforced`, `Cascading deletes are handled`],
      });
    }
  }

  return areas;
}
