import type { ProjectGraph, FondamentaConfig } from '../types/index.js';

// --- Agent findings ---

export type FindingSeverity = 'error' | 'warning' | 'info';

export interface AgentFinding {
  agentId: string;
  severity: FindingSeverity;
  title: string;
  filePath?: string;
  message: string;
  suggestion?: string;
}

// --- Agent interface ---

export type AgentTier = 'free' | 'pro';

export interface Agent {
  id: string;
  name: string;
  description: string;
  tier: AgentTier;
  run(graph: ProjectGraph, config: FondamentaConfig): AgentFinding[];
}

// --- Run results ---

export interface AgentResult {
  agentId: string;
  tier: AgentTier;
  findings: AgentFinding[];
  durationMs: number;
  skipped: boolean;
  skipReason?: string;
}

export interface AgentsRunSummary {
  results: AgentResult[];
  totalFindings: number;
  errors: number;
  warnings: number;
  infos: number;
  agentsRan: number;
  agentsSkipped: number;
  totalDurationMs: number;
}

// --- License ---

export interface LicenseInfo {
  valid: boolean;
  tier: 'free' | 'pro';
  expiresAt?: string;
  message?: string;
}

// --- Config extensions ---

export interface AgentsConfig {
  enabled: boolean;
  license?: string;
  exclude?: string[];
}
