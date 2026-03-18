import type { ApiRouteInfo, FondamentaConfig } from '../types/index.js';
import { header, section, bullet, bulletList, table, anchor, tocEntry, overrideNote, type GeneratorContext } from './base.js';

export function generateApiRoutes(ctx: GeneratorContext, config?: FondamentaConfig): string {
  const { graph } = ctx;
  const routes = graph.apiRoutes;

  if (routes.length === 0) return '';

  // Group by classification (if configured) or by top-level path
  const classification = config?.routeClassification;
  const groups = classification
    ? groupByClassification(routes, classification.mappings, classification.defaultGroup)
    : groupByPath(routes);
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

  // Classification summary (if configured)
  if (classification) {
    output += `${section(2, 'Classification Summary')}\n\n`;
    output += table(
      ['Group', 'Routes'],
      groupNames.map((g) => [g, String(groups[g].length)]),
    );
    output += '\n\n';
  }

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
      output += generateRouteEntry(route, ctx);
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

function groupByClassification(
  routes: ApiRouteInfo[],
  mappings: Record<string, [string, string]>,
  defaultGroup?: string,
): Record<string, ApiRouteInfo[]> {
  const groups: Record<string, ApiRouteInfo[]> = {};
  // Sort prefixes longest-first for correct matching
  const prefixes = Object.keys(mappings).sort((a, b) => b.length - a.length);

  for (const route of routes) {
    const routePath = route.routePath.replace(/^\/api\//, '');
    let groupLabel = defaultGroup ?? 'Other';

    for (const prefix of prefixes) {
      if (routePath.startsWith(prefix)) {
        const [group, subgroup] = mappings[prefix];
        groupLabel = `${group} — ${subgroup}`;
        route.group = group;
        route.subgroup = subgroup;
        break;
      }
    }

    if (!groups[groupLabel]) groups[groupLabel] = [];
    groups[groupLabel].push(route);
  }

  return groups;
}

function generateRouteEntry(route: ApiRouteInfo, ctx: GeneratorContext): string {
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

  output += overrideNote(ctx, route.filePath);

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
