export { analyzeProject, type AnalysisResult } from './analyzers/project-analyzer.js';
export { parseVueFile } from './analyzers/vue-parser.js';
export { detectFramework } from './framework/detector.js';
export { parsePrismaSchema } from './schema/prisma-parser.js';
export { parseDrizzleSchema } from './schema/drizzle-parser.js';
export { saveState, loadState, computeDiff } from './utils/state.js';
export { generateClaudeMd, generateCursorRules, generateCopilotInstructions } from './generators/ai-context-generator.js';
export * from './generators/index.js';
export * from './types/index.js';

// Agents
export {
  ALL_AGENTS,
  runAgents,
  listAgents,
  getAgent,
  generateAgentsReport,
  type Agent,
  type AgentFinding,
  type AgentResult,
  type AgentsRunSummary,
} from './agents/index.js';
