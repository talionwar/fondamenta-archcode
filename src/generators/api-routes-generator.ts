import type { ProjectGraph, ApiRouteInfo } from '../types/index.js';
import { header, section, bullet, bulletList, table, anchor, tocEntry, type GeneratorContext } from './base.js';

export function generateApiRoutes(ctx: GeneratorContext): string {
  const { graph } = ctx;
  const routes = graph.apiRoutes;

  if (routes.length === 0) return '';

  // Group by top-level path
  const groups = groupByPath(routes);
  const groupNames = Object.keys(groups).sort();

  let output = header('API Routes — Atomic Analysis', ctx, routes.length, 'routes');

  // Table of Contents
  output += '## Table of Contents\n\n';
  let tocIndex = 1;
  for (const name of groupNames) {
    output += tocEntry(anchor(name), `${tocIndex}. ${name} (${groups[name].length})`);
    output += '\n';
    tocIndex++;
  }
  output += '\n---\n\n';

  // Summary table
  output += `${section(2, 'Summary')}\n\n`;
  const summaryRows = routes.map((r) => [
    `\`${r.routePath}\``,
    r.methods.join(', '),
    r.auth,
    r.models.join(', ') || '-',
  ]);
  output += table(['Route', 'Methods', 'Auth', 'Models'], summaryRows);
  output += '\n\n---\n\n';

  // Detailed entries
  let groupIndex = 1;
  for (const name of groupNames) {
    output += `${section(2, `${groupIndex}. ${name}`)}\n\n`;

    for (const route of groups[name]) {
      output += generateRouteEntry(route);
    }

    groupIndex++;
  }

  // Cross-cutting analysis
  output += generateCrossCuttingAnalysis(routes);

  return output;
}

function groupByPath(routes: ApiRouteInfo[]): Record<string, ApiRouteInfo[]> {
  const groups: Record<string, ApiRouteInfo[]> = {};

  for (const route of routes) {
    const parts = route.routePath.replace(/^\/api\//, '').split('/');
    const groupName = parts[0] || 'root';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(route);
  }

  return groups;
}

function generateRouteEntry(route: ApiRouteInfo): string {
  let output = `${section(3, `\`${route.routePath}\``)}\n\n`;

  output += `${bullet('File', `\`${route.filePath}\``)}\n`;
  output += `${bullet('Methods', route.methods.map((m) => `\`${m}\``).join(', '))}\n`;
  output += `${bullet('Auth', route.auth)}\n`;

  if (route.models.length > 0) {
    output += `${bulletList('Models', route.models.map((m) => `\`${m}\``))}\n`;
  }

  if (route.sideEffects.length > 0) {
    output += `${bulletList('Side Effects', route.sideEffects)}\n`;
  }

  output += '\n';
  return output;
}

function generateCrossCuttingAnalysis(routes: ApiRouteInfo[]): string {
  let output = `\n---\n\n${section(2, 'Cross-Cutting Analysis')}\n\n`;

  // Auth summary
  const authCounts: Record<string, number> = {};
  for (const route of routes) {
    authCounts[route.auth] = (authCounts[route.auth] || 0) + 1;
  }
  output += `${section(3, 'Auth Levels')}\n\n`;
  output += table(
    ['Auth Type', 'Count'],
    Object.entries(authCounts).map(([auth, count]) => [auth, String(count)]),
  );
  output += '\n\n';

  // Model usage
  const modelCounts: Record<string, number> = {};
  for (const route of routes) {
    for (const model of route.models) {
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    }
  }
  if (Object.keys(modelCounts).length > 0) {
    output += `${section(3, 'Model Usage')}\n\n`;
    const sorted = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);
    output += table(
      ['Model', 'Routes'],
      sorted.map(([model, count]) => [`\`${model}\``, String(count)]),
    );
    output += '\n\n';
  }

  return output;
}
