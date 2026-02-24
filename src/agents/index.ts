import type { Agent, AgentResult, AgentsRunSummary, AgentsConfig } from './types.js';
import type { ProjectGraph, FondamentaConfig } from '../types/index.js';
import { validateLicense } from './license.js';

// Free agents
import { deadCodeAgent } from './free/dead-code.js';
import { circularDepsAgent } from './free/circular-deps.js';
import { architectureGuardAgent } from './free/architecture-guard.js';

// PRO agents
import { securityScannerAgent } from './pro/security-scanner.js';
import { schemaDriftAgent } from './pro/schema-drift.js';
import { performanceSentinelAgent } from './pro/performance-sentinel.js';
import { conventionEnforcerAgent } from './pro/convention-enforcer.js';
import { impactAnalyzerAgent } from './pro/impact-analyzer.js';

// --- Registry ---

export const ALL_AGENTS: Agent[] = [
  // Free
  deadCodeAgent,
  circularDepsAgent,
  architectureGuardAgent,
  // PRO
  securityScannerAgent,
  schemaDriftAgent,
  performanceSentinelAgent,
  conventionEnforcerAgent,
  impactAnalyzerAgent,
];

export function getAgent(id: string): Agent | undefined {
  return ALL_AGENTS.find((a) => a.id === id);
}

export function listAgents(): Agent[] {
  return ALL_AGENTS;
}

// --- Runner ---

export interface RunAgentsOptions {
  freeOnly?: boolean;
  agentIds?: string[];
}

export function runAgents(
  graph: ProjectGraph,
  config: FondamentaConfig,
  options: RunAgentsOptions = {},
): AgentsRunSummary {
  const start = Date.now();
  const license = validateLicense(config.agents?.license);
  const results: AgentResult[] = [];

  let agents = ALL_AGENTS;

  // Filter by specific agent IDs
  if (options.agentIds && options.agentIds.length > 0) {
    agents = agents.filter((a) => options.agentIds!.includes(a.id));
  }

  // Filter by free only
  if (options.freeOnly) {
    agents = agents.filter((a) => a.tier === 'free');
  }

  // Filter by config exclude
  const excluded = new Set(config.agents?.exclude ?? []);

  for (const agent of agents) {
    // Skip excluded agents
    if (excluded.has(agent.id)) {
      results.push({
        agentId: agent.id,
        tier: agent.tier,
        findings: [],
        durationMs: 0,
        skipped: true,
        skipReason: 'excluded in config',
      });
      continue;
    }

    // Skip PRO agents without valid license
    if (agent.tier === 'pro' && !license.valid) {
      results.push({
        agentId: agent.id,
        tier: agent.tier,
        findings: [],
        durationMs: 0,
        skipped: true,
        skipReason: 'PRO license required',
      });
      continue;
    }

    // Run the agent
    const agentStart = Date.now();
    try {
      const findings = agent.run(graph, config);
      results.push({
        agentId: agent.id,
        tier: agent.tier,
        findings,
        durationMs: Date.now() - agentStart,
        skipped: false,
      });
    } catch (err) {
      results.push({
        agentId: agent.id,
        tier: agent.tier,
        findings: [{
          agentId: agent.id,
          severity: 'error',
          title: 'Agent crashed',
          message: `${agent.name} threw an error: ${err instanceof Error ? err.message : String(err)}`,
        }],
        durationMs: Date.now() - agentStart,
        skipped: false,
      });
    }
  }

  // Compute summary
  const allFindings = results.flatMap((r) => r.findings);
  const summary: AgentsRunSummary = {
    results,
    totalFindings: allFindings.length,
    errors: allFindings.filter((f) => f.severity === 'error').length,
    warnings: allFindings.filter((f) => f.severity === 'warning').length,
    infos: allFindings.filter((f) => f.severity === 'info').length,
    agentsRan: results.filter((r) => !r.skipped).length,
    agentsSkipped: results.filter((r) => r.skipped).length,
    totalDurationMs: Date.now() - start,
  };

  return summary;
}

// Re-exports
export type { Agent, AgentFinding, AgentResult, AgentsRunSummary, AgentsConfig, LicenseInfo } from './types.js';
export { validateLicense, generateLicenseKey } from './license.js';
export { printAgentResult, printFindings, printSummary, generateAgentsReport } from './reporter.js';
