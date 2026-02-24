import type { Agent, AgentFinding } from '../types.js';
import type { ProjectGraph, FondamentaConfig } from '../../types/index.js';

export const performanceSentinelAgent: Agent = {
  id: 'performance-sentinel',
  name: 'Performance Sentinel',
  description: 'Detects heavy pages, unnecessary client components, and API call waterfalls',
  tier: 'pro',

  run(graph: ProjectGraph, config: FondamentaConfig): AgentFinding[] {
    const maxPageImports = config.agents?.thresholds?.maxPageImports ?? 20;
    const maxApiCallsPerPage = config.agents?.thresholds?.maxApiCallsPerPage ?? 5;
    const findings: AgentFinding[] = [];

    // 1. Pages with too many imports
    for (const page of graph.pages) {
      const node = graph.nodes.get(page.filePath);
      if (!node) continue;

      const importCount = node.metadata.imports.length;
      if (importCount > maxPageImports) {
        findings.push({
          agentId: 'performance-sentinel',
          severity: 'warning',
          title: 'Heavy page',
          filePath: page.filePath,
          message: `Page \`${page.routePath}\` has ${importCount} imports (threshold: ${maxPageImports})`,
          suggestion: 'Lazy-load non-critical components with dynamic() or React.lazy()',
        });
      }
    }

    // 2. Client components that don't use client-only features
    for (const comp of graph.components) {
      if (comp.componentType !== 'client') continue;

      const hasClientFeatures =
        comp.hooks.length > 0 ||
        comp.state.length > 0 ||
        comp.apiCalls.length > 0 ||
        comp.sideEffects.length > 0;

      if (!hasClientFeatures) {
        findings.push({
          agentId: 'performance-sentinel',
          severity: 'warning',
          title: 'Unnecessary client component',
          filePath: comp.filePath,
          message: `\`${comp.name}\` is a client component but uses no hooks, state, or side effects`,
          suggestion: 'Remove "use client" to make it a server component',
        });
      }
    }

    // 3. Pages with multiple API calls (waterfall risk)
    for (const page of graph.pages) {
      if (page.apiCalls.length > maxApiCallsPerPage) {
        findings.push({
          agentId: 'performance-sentinel',
          severity: 'warning',
          title: 'API call waterfall risk',
          filePath: page.filePath,
          message: `Page \`${page.routePath}\` makes ${page.apiCalls.length} API calls (threshold: ${maxApiCallsPerPage})`,
          suggestion: 'Consolidate API calls or use parallel fetching with Promise.all',
        });
      }
    }

    // 4. Large components with many renders
    for (const comp of graph.components) {
      if (comp.renders.length > 15) {
        findings.push({
          agentId: 'performance-sentinel',
          severity: 'info',
          title: 'Component with many children',
          filePath: comp.filePath,
          message: `\`${comp.name}\` renders ${comp.renders.length} child components`,
          suggestion: 'Consider code-splitting or extracting sub-sections',
        });
      }
    }

    return findings;
  },
};
