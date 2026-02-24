import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProject } from '../../src/analyzers/project-analyzer.js';
import { DEFAULT_CONFIG } from '../../src/types/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixtureDir = resolve(__dirname, '../fixtures/drizzle-project');

describe('Drizzle Integration - Project Analysis', () => {
  it('should detect and parse Drizzle schemas during project analysis', async () => {
    const result = await analyzeProject(fixtureDir, DEFAULT_CONFIG);

    expect(result.graph.schema).toBeDefined();
    expect(result.graph.schema.models.length).toBeGreaterThanOrEqual(2);
  });

  it('should extract models from Drizzle schema', async () => {
    const result = await analyzeProject(fixtureDir, DEFAULT_CONFIG);

    const userModel = result.graph.schema.models.find((m) => m.name === 'Users');
    expect(userModel).toBeDefined();
    expect(userModel?.fields.length).toBeGreaterThan(0);

    const postModel = result.graph.schema.models.find((m) => m.name === 'Posts');
    expect(postModel).toBeDefined();
  });

  it('should extract enums from Drizzle schema', async () => {
    const result = await analyzeProject(fixtureDir, DEFAULT_CONFIG);

    expect(result.graph.schema.enums.length).toBeGreaterThan(0);
  });

  it('should correctly identify relations in schema', async () => {
    const result = await analyzeProject(fixtureDir, DEFAULT_CONFIG);

    const userModel = result.graph.schema.models.find((m) => m.name === 'Users');
    expect(userModel?.relations.length).toBeGreaterThan(0);

    const postsRelation = userModel?.relations.find((r) => r.field === 'posts');
    expect(postsRelation?.type).toBe('one-to-many');
  });
});
