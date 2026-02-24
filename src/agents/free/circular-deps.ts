import type { Agent, AgentFinding } from '../types.js';
import type { ProjectGraph, FondamentaConfig } from '../../types/index.js';

export const circularDepsAgent: Agent = {
  id: 'circular-deps',
  name: 'Circular Dependencies',
  description: 'Detects circular import chains using DFS 3-color algorithm on the dependency graph',
  tier: 'free',

  run(graph: ProjectGraph, _config: FondamentaConfig): AgentFinding[] {
    const findings: AgentFinding[] = [];

    // Build adjacency list from edges
    const adj = new Map<string, Set<string>>();
    for (const edge of graph.edges) {
      if (edge.type !== 'imports') continue;
      if (!adj.has(edge.from)) adj.set(edge.from, new Set());
      adj.get(edge.from)!.add(edge.to);
    }

    // DFS 3-color: WHITE=0, GRAY=1, BLACK=2
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    const parent = new Map<string, string>();
    const cycles: string[][] = [];
    const reportedCycles = new Set<string>();

    for (const nodeId of graph.nodes.keys()) {
      color.set(nodeId, WHITE);
    }

    function dfs(u: string): void {
      color.set(u, GRAY);
      const neighbors = adj.get(u);
      if (neighbors) {
        for (const v of neighbors) {
          if (!color.has(v)) continue;

          if (color.get(v) === GRAY) {
            // Back edge found — extract cycle
            const cycle: string[] = [v];
            let curr = u;
            while (curr !== v) {
              cycle.push(curr);
              curr = parent.get(curr)!;
              if (!curr) break;
            }
            cycle.push(v);
            cycle.reverse();

            // Deduplicate: normalize cycle by sorting and creating a key
            const normalized = [...cycle.slice(0, -1)].sort().join('|');
            if (!reportedCycles.has(normalized)) {
              reportedCycles.add(normalized);
              cycles.push(cycle);
            }
          } else if (color.get(v) === WHITE) {
            parent.set(v, u);
            dfs(v);
          }
        }
      }
      color.set(u, BLACK);
    }

    for (const nodeId of graph.nodes.keys()) {
      if (color.get(nodeId) === WHITE) {
        dfs(nodeId);
      }
    }

    // Report cycles
    for (const cycle of cycles) {
      const len = cycle.length - 1; // -1 because last === first
      const severity = len <= 2 ? 'error' as const : 'warning' as const;
      const chain = cycle.join(' → ');

      findings.push({
        agentId: 'circular-deps',
        severity,
        title: `Circular dependency (${len} files)`,
        filePath: cycle[0],
        message: `Import cycle: ${chain}`,
        suggestion: len <= 2
          ? 'Break the cycle by extracting shared types/utils into a separate file'
          : 'Consider introducing an interface or barrel file to break the dependency chain',
      });
    }

    return findings;
  },
};
