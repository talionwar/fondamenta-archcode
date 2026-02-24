import type { Agent, AgentFinding } from '../types.js';
import type { ProjectGraph, FondamentaConfig } from '../../types/index.js';

const HIGH_FAN_IN = 10;
const HIGH_FAN_OUT = 15;

export const impactAnalyzerAgent: Agent = {
  id: 'impact-analyzer',
  name: 'Impact Analyzer',
  description: 'Identifies high fan-in/fan-out nodes, hub components, and articulation points in the graph',
  tier: 'pro',

  run(graph: ProjectGraph, _config: FondamentaConfig): AgentFinding[] {
    const findings: AgentFinding[] = [];

    // Build fan-in / fan-out maps
    const fanIn = new Map<string, number>();
    const fanOut = new Map<string, number>();

    for (const edge of graph.edges) {
      fanOut.set(edge.from, (fanOut.get(edge.from) ?? 0) + 1);
      fanIn.set(edge.to, (fanIn.get(edge.to) ?? 0) + 1);
    }

    // 1. High fan-in (many files depend on this)
    for (const [nodeId, count] of fanIn) {
      if (count < HIGH_FAN_IN) continue;

      const node = graph.nodes.get(nodeId);
      if (!node) continue;

      // Skip type-only files
      if (node.id.includes('.d.ts')) continue;

      findings.push({
        agentId: 'impact-analyzer',
        severity: 'info',
        title: 'High-impact file (fan-in)',
        filePath: node.id,
        message: `${count} files depend on this file — changes here have wide blast radius`,
        suggestion: 'Ensure thorough testing when modifying this file',
      });
    }

    // 2. High fan-out (this file depends on too many others)
    for (const [nodeId, count] of fanOut) {
      if (count < HIGH_FAN_OUT) continue;

      const node = graph.nodes.get(nodeId);
      if (!node) continue;

      findings.push({
        agentId: 'impact-analyzer',
        severity: 'info',
        title: 'High coupling (fan-out)',
        filePath: node.id,
        message: `File imports from ${count} other files (threshold: ${HIGH_FAN_OUT})`,
        suggestion: 'Consider reducing dependencies or splitting the file',
      });
    }

    // 3. Hub components (high usedBy + high renders)
    for (const comp of graph.components) {
      const usedByCount = comp.usedBy.length;
      const rendersCount = comp.renders.length;

      if (usedByCount >= 5 && rendersCount >= 5) {
        findings.push({
          agentId: 'impact-analyzer',
          severity: 'warning',
          title: 'Hub component',
          filePath: comp.filePath,
          message: `\`${comp.name}\` is used by ${usedByCount} files and renders ${rendersCount} children — critical junction point`,
          suggestion: 'Handle with care: changes propagate both up and down the component tree',
        });
      }
    }

    // 4. Articulation points approximation (simple degree-based heuristic)
    // A node is likely an articulation point if it has high fan-in AND fan-out
    for (const [nodeId] of graph.nodes) {
      const fi = fanIn.get(nodeId) ?? 0;
      const fo = fanOut.get(nodeId) ?? 0;

      if (fi >= 5 && fo >= 5) {
        // Check it wasn't already reported as hub component
        const isComponent = graph.components.some((c) => c.filePath === nodeId);
        if (isComponent) continue;

        const node = graph.nodes.get(nodeId)!;
        findings.push({
          agentId: 'impact-analyzer',
          severity: 'info',
          title: 'Bridge file',
          filePath: nodeId,
          message: `File acts as a bridge: ${fi} dependents, ${fo} dependencies — removing it would disconnect parts of the graph`,
          suggestion: 'This is a critical infrastructure file — ensure it has clear responsibilities',
        });
      }
    }

    return findings;
  },
};
