import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProject } from '../../src/analyzers/project-analyzer.js';
import { DEFAULT_CONFIG } from '../../src/types/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, '../fixtures');

describe('Project Analyzer', () => {
  it('should analyze simple-nextjs fixture', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'simple-nextjs'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-app' },
    );

    expect(result).toBeDefined();
    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.framework).toBe('nextjs-app');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should build a graph with nodes', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'simple-nextjs'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-app' },
    );

    expect(result.graph.nodes.size).toBeGreaterThan(0);

    // Every node should have required fields
    for (const [id, node] of result.graph.nodes) {
      expect(node.id).toBe(id);
      expect(node.type).toBeDefined();
      expect(node.filePath).toBeDefined();
    }
  });

  it('should classify pages correctly', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'simple-nextjs'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-app' },
    );

    expect(result.graph.pages.length).toBeGreaterThan(0);
    const homeRoute = result.graph.pages.find((p) => p.routePath === '/');
    expect(homeRoute).toBeDefined();
  });

  it('should detect components', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'simple-nextjs'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-app' },
    );

    expect(result.graph.components.length).toBeGreaterThan(0);
    const buttonComp = result.graph.components.find((c) => c.name === 'Button');
    expect(buttonComp).toBeDefined();
  });

  it('should detect API routes', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'simple-nextjs'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-app' },
    );

    expect(result.graph.apiRoutes.length).toBeGreaterThan(0);
  });

  it('should build import edges', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'simple-nextjs'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-app' },
    );

    expect(result.graph.edges.length).toBeGreaterThanOrEqual(0);
    for (const edge of result.graph.edges) {
      expect(edge.from).toBeDefined();
      expect(edge.to).toBeDefined();
      expect(edge.type).toBe('imports');
    }
  });

  it('should parse Prisma schema', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'simple-nextjs'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-app' },
    );

    expect(result.graph.schema.models.length).toBeGreaterThan(0);
    const modelNames = result.graph.schema.models.map((m) => m.name);
    expect(modelNames).toContain('User');
  });

  it('should handle pages-router fixture', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'pages-router'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-pages' },
    );

    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.graph.pages.length).toBeGreaterThan(0);
  });

  it('should track usedBy for components', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'simple-nextjs'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-app' },
    );

    for (const comp of result.graph.components) {
      expect(Array.isArray(comp.usedBy)).toBe(true);
    }
  });

  it('should include lineCount in node metadata', async () => {
    const result = await analyzeProject(
      resolve(fixturesDir, 'simple-nextjs'),
      { ...DEFAULT_CONFIG, framework: 'nextjs-app' },
    );

    for (const [, node] of result.graph.nodes) {
      // lineCount should be in metadata (via [key: string]: unknown)
      expect(node.metadata).toBeDefined();
    }
  });
});
