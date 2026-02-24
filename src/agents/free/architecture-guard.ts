import type { Agent, AgentFinding } from '../types.js';
import type { ProjectGraph, FondamentaConfig } from '../../types/index.js';

const MAX_LINE_COUNT = 500;
const MAX_DEPENDENCIES = 15;

export const architectureGuardAgent: Agent = {
  id: 'architecture-guard',
  name: 'Architecture Guard',
  description: 'Flags oversized files, god components, and mutation routes without auth checks',
  tier: 'free',

  run(graph: ProjectGraph, _config: FondamentaConfig): AgentFinding[] {
    const findings: AgentFinding[] = [];

    // 1. Files too large (>500 lines)
    for (const [, node] of graph.nodes) {
      const lineCount = (node.metadata as Record<string, unknown>).lineCount as number | undefined;
      if (lineCount && lineCount > MAX_LINE_COUNT) {
        findings.push({
          agentId: 'architecture-guard',
          severity: 'warning',
          title: 'Oversized file',
          filePath: node.id,
          message: `File has ${lineCount} lines (threshold: ${MAX_LINE_COUNT})`,
          suggestion: 'Split into smaller, focused modules',
        });
      }
    }

    // 2. God components (>15 dependencies)
    for (const comp of graph.components) {
      const node = graph.nodes.get(comp.filePath);
      if (!node) continue;

      const depCount = node.metadata.imports.length;
      if (depCount > MAX_DEPENDENCIES) {
        findings.push({
          agentId: 'architecture-guard',
          severity: 'warning',
          title: 'God component',
          filePath: comp.filePath,
          message: `Component \`${comp.name}\` has ${depCount} imports (threshold: ${MAX_DEPENDENCIES})`,
          suggestion: 'Extract sub-components or use composition pattern',
        });
      }
    }

    // 3. Mutation API routes without auth
    for (const route of graph.apiRoutes) {
      const hasMutation = route.methods.some((m) =>
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(m),
      );
      if (!hasMutation) continue;

      const hasDbAccess = route.models.length > 0;
      if (!hasDbAccess) continue;

      if (route.auth === 'None') {
        findings.push({
          agentId: 'architecture-guard',
          severity: 'error',
          title: 'Unprotected mutation route',
          filePath: route.filePath,
          message: `Route \`${route.routePath}\` (${route.methods.join(',')}) accesses DB models [${route.models.join(', ')}] without auth`,
          suggestion: 'Add auth() or getServerSession check before DB operations',
        });
      }
    }

    // 4. Pages with too many components
    for (const page of graph.pages) {
      if (page.components.length > 20) {
        findings.push({
          agentId: 'architecture-guard',
          severity: 'info',
          title: 'Complex page',
          filePath: page.filePath,
          message: `Page \`${page.routePath}\` renders ${page.components.length} components`,
          suggestion: 'Consider splitting into smaller sub-pages or extracting sections',
        });
      }
    }

    return findings;
  },
};
