import type { Agent, AgentFinding } from '../types.js';
import type { ProjectGraph, FondamentaConfig } from '../../types/index.js';

const DANGEROUS_PATTERNS = [
  { pattern: /eval\(/, name: 'eval()' },
  { pattern: /innerHTML\s*=/, name: 'innerHTML assignment' },
  { pattern: /dangerouslySetInnerHTML/, name: 'dangerouslySetInnerHTML' },
  { pattern: /document\.write/, name: 'document.write' },
  { pattern: /exec\(/, name: 'exec()' },
  { pattern: /child_process/, name: 'child_process import' },
];

export const securityScannerAgent: Agent = {
  id: 'security-scanner',
  name: 'Security Scanner',
  description: 'Detects routes without auth that access DB, env vars leaked to client, and insecure patterns',
  tier: 'pro',

  run(graph: ProjectGraph, _config: FondamentaConfig): AgentFinding[] {
    const findings: AgentFinding[] = [];

    // 1. API routes with DB access but no auth
    for (const route of graph.apiRoutes) {
      if (route.models.length === 0) continue;
      if (route.auth !== 'None') continue;

      findings.push({
        agentId: 'security-scanner',
        severity: 'error',
        title: 'Unauthenticated DB access',
        filePath: route.filePath,
        message: `Route \`${route.routePath}\` accesses models [${route.models.join(', ')}] without any auth check`,
        suggestion: 'Add auth() guard at the top of the handler',
      });
    }

    // 2. Client-side env vars that aren't NEXT_PUBLIC_
    for (const comp of graph.components) {
      if (comp.componentType !== 'client') continue;

      const node = graph.nodes.get(comp.filePath);
      if (!node) continue;

      // Check lib files used by this component for env vars
      for (const imp of node.metadata.imports) {
        const lib = graph.libs.find((l) => l.filePath === imp.resolvedPath);
        if (!lib) continue;

        for (const envVar of lib.envVars) {
          if (!envVar.startsWith('NEXT_PUBLIC_') && !envVar.startsWith('NODE_ENV')) {
            findings.push({
              agentId: 'security-scanner',
              severity: 'error',
              title: 'Server env var in client context',
              filePath: comp.filePath,
              message: `Client component imports lib that uses \`${envVar}\` (not NEXT_PUBLIC_)`,
              suggestion: `Move the logic to a server component or API route, or rename to NEXT_PUBLIC_${envVar}`,
            });
          }
        }
      }
    }

    // 3. Env vars directly used in lib files referenced by client components
    for (const lib of graph.libs) {
      for (const envVar of lib.envVars) {
        if (envVar.startsWith('NEXT_PUBLIC_') || envVar === 'NODE_ENV') continue;

        // Check if any client component imports this lib
        const clientImporters = lib.usedBy.filter((u) => {
          const comp = graph.components.find((c) => c.filePath === u);
          return comp?.componentType === 'client';
        });

        if (clientImporters.length > 0) {
          findings.push({
            agentId: 'security-scanner',
            severity: 'warning',
            title: 'Server env var exposed to client bundle',
            filePath: lib.filePath,
            message: `\`${envVar}\` used in lib imported by ${clientImporters.length} client component(s)`,
            suggestion: 'Split server-only logic into a separate file',
          });
        }
      }
    }

    // 4. Dangerous code patterns (check all nodes with raw content from metadata)
    for (const [, node] of graph.nodes) {
      // We scan exports/imports for signals since we don't have raw content in the graph
      // Check for dangerous imports
      for (const imp of node.metadata.imports) {
        if (imp.source === 'child_process' || imp.source === 'node:child_process') {
          if (node.type === 'api-route' || node.type === 'lib') {
            findings.push({
              agentId: 'security-scanner',
              severity: 'warning',
              title: 'Shell execution import',
              filePath: node.id,
              message: `File imports \`${imp.source}\` — ensure inputs are sanitized`,
              suggestion: 'Use parameterized commands instead of string interpolation',
            });
          }
        }
      }
    }

    return findings;
  },
};
