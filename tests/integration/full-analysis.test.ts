import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProject } from '../../src/analyzers/project-analyzer.js';
import { runAgents } from '../../src/agents/index.js';
import { DEFAULT_CONFIG } from '../../src/types/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, '../../tests/fixtures');

describe('Full Project Analysis Integration', () => {
  it('should analyze simple-nextjs fixture without error', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);

    expect(result).toBeDefined();
    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.framework).toBe('nextjs-app');
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should detect pages in simple-nextjs', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);

    expect(result.graph.pages.length).toBeGreaterThan(0);
    const pageRoutes = result.graph.pages.map((p) => p.routePath);
    expect(pageRoutes).toContain('/');
  });

  it('should detect components in simple-nextjs', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);

    expect(result.graph.components.length).toBeGreaterThan(0);
    const componentNames = result.graph.components.map((c) => c.name);
    expect(componentNames).toContain('Button');
  });

  it('should detect API routes in simple-nextjs', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);

    expect(result.graph.apiRoutes.length).toBeGreaterThan(0);
    const routePaths = result.graph.apiRoutes.map((r) => r.routePath);
    expect(routePaths).toContain('/api/users');
  });

  it('should detect schema models in simple-nextjs', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);

    expect(result.graph.schema.models.length).toBeGreaterThan(0);
    const modelNames = result.graph.schema.models.map((m) => m.name);
    expect(modelNames).toContain('User');
    expect(modelNames).toContain('Post');
  });

  it('should run agents on simple-nextjs without error', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);
    const agentResults = runAgents(result.graph, config);

    expect(agentResults).toBeDefined();
    expect(agentResults.results).toBeDefined();
    expect(Array.isArray(agentResults.results)).toBe(true);
  });

  it('should detect OrphanWidget as dead code', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);
    const agentResults = runAgents(result.graph, config);

    const deadCodeResults = agentResults.results.find((r) => r.agentId === 'dead-code');
    expect(deadCodeResults).toBeDefined();

    const orphanWidget = deadCodeResults?.findings.find(
      (f) =>
        f.filePath &&
        f.filePath.includes('OrphanWidget') &&
        f.title.includes('Orphan'),
    );
    expect(orphanWidget).toBeDefined();
  });

  it('should detect circular dependencies in circular-deps fixture', async () => {
    const projectRoot = resolve(fixturesDir, 'circular-deps');
    const config = { ...DEFAULT_CONFIG, framework: 'auto' as const };

    const result = await analyzeProject(projectRoot, config);
    const agentResults = runAgents(result.graph, config);

    const circularResults = agentResults.results.find(
      (r) => r.agentId === 'circular-deps',
    );
    expect(circularResults).toBeDefined();
    expect(circularResults?.findings.length).toBeGreaterThan(0);

    const cycleFinding = circularResults?.findings[0];
    expect(cycleFinding?.title).toContain('Circular dependency');
  });

  it('should provide agent summary with counts', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);
    const agentResults = runAgents(result.graph, config);

    expect(agentResults.totalFindings).toBeGreaterThanOrEqual(0);
    expect(agentResults.errors).toBeGreaterThanOrEqual(0);
    expect(agentResults.warnings).toBeGreaterThanOrEqual(0);
    expect(agentResults.infos).toBeGreaterThanOrEqual(0);
    expect(agentResults.agentsRan).toBeGreaterThan(0);
    expect(agentResults.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should have nodes map populated', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);

    expect(result.graph.nodes.size).toBeGreaterThan(0);
    for (const [id, node] of result.graph.nodes) {
      expect(node.id).toBe(id);
      expect(node.type).toBeDefined();
      expect(node.filePath).toBeDefined();
      expect(node.metadata).toBeDefined();
    }
  });

  it('should have edges representing import relationships', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);

    // Should have some edges for imports
    expect(result.graph.edges.length).toBeGreaterThan(0);
    for (const edge of result.graph.edges) {
      expect(edge.from).toBeDefined();
      expect(edge.to).toBeDefined();
      expect(edge.type).toBe('imports');
    }
  });

  it('should track component usage with usedBy', async () => {
    const projectRoot = resolve(fixturesDir, 'simple-nextjs');
    const config = { ...DEFAULT_CONFIG, framework: 'nextjs-app' as const };

    const result = await analyzeProject(projectRoot, config);

    const buttonComponent = result.graph.components.find((c) => c.name === 'Button');
    expect(buttonComponent).toBeDefined();
    expect(Array.isArray(buttonComponent?.usedBy)).toBe(true);
  });
});
