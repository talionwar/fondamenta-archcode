export { analyzeProject, type AnalysisResult } from './analyzers/project-analyzer.js';
export { detectFramework } from './framework/detector.js';
export { parsePrismaSchema } from './schema/prisma-parser.js';
export { saveState, loadState, computeDiff } from './utils/state.js';
export { generateClaudeMd, generateCursorRules, generateCopilotInstructions } from './generators/ai-context-generator.js';
export * from './generators/index.js';
export * from './types/index.js';
