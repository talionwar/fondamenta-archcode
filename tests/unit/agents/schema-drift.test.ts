import { describe, it, expect } from 'vitest';
import { schemaDriftAgent } from '../../../src/agents/pro/schema-drift.js';
import { DEFAULT_CONFIG } from '../../../src/types/index.js';
import { createMockGraph, createMockApiRoute } from '../../helpers.js';

describe('Schema Drift Agent', () => {
  it('should flag model used in code but not in schema', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/comments/route.ts',
          routePath: '/api/comments',
          methods: ['GET'],
          auth: 'auth()',
          models: ['Comment', 'Post'],
        }),
      ],
      schema: {
        models: [{ name: 'Post', fields: [], relations: [] }],
        enums: [],
      },
    });

    const findings = schemaDriftAgent.run(graph, DEFAULT_CONFIG);
    const missing = findings.find((f) => f.title === 'Model used but not in schema');

    expect(missing).toBeDefined();
    expect(missing?.message).toContain('Comment');
  });

  it('should flag unused schema model', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/users/route.ts',
          routePath: '/api/users',
          methods: ['GET'],
          auth: 'auth()',
          models: ['User'],
        }),
      ],
      schema: {
        models: [
          { name: 'User', fields: [], relations: [] },
          { name: 'UnusedModel', fields: [], relations: [] },
        ],
        enums: [],
      },
    });

    const findings = schemaDriftAgent.run(graph, DEFAULT_CONFIG);
    const unused = findings.find(
      (f) => f.title === 'Unused schema model' && f.message.includes('UnusedModel'),
    );

    expect(unused).toBeDefined();
    expect(unused?.severity).toBe('info');
  });

  it('should skip framework models (Account, Session)', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/users/route.ts',
          routePath: '/api/users',
          methods: ['GET'],
          auth: 'auth()',
          models: ['User'],
        }),
      ],
      schema: {
        models: [
          { name: 'User', fields: [], relations: [] },
          { name: 'Account', fields: [], relations: [] },
          { name: 'Session', fields: [], relations: [] },
        ],
        enums: [],
      },
    });

    const findings = schemaDriftAgent.run(graph, DEFAULT_CONFIG);
    const frameworkFinding = findings.find(
      (f) => f.message.includes('Account') || f.message.includes('Session'),
    );

    expect(frameworkFinding).toBeUndefined();
  });

  it('should handle PascalCase / lowercase model name matching', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/users/route.ts',
          routePath: '/api/users',
          methods: ['GET'],
          auth: 'auth()',
          models: ['user'],
        }),
      ],
      schema: {
        models: [{ name: 'User', fields: [], relations: [] }],
        enums: [],
      },
    });

    const findings = schemaDriftAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should report if no schema detected', () => {
    const graph = createMockGraph({
      apiRoutes: [],
      schema: { models: [], enums: [] },
    });

    const findings = schemaDriftAgent.run(graph, DEFAULT_CONFIG);
    const noSchema = findings.find((f) => f.title === 'No schema detected');

    expect(noSchema).toBeDefined();
    expect(noSchema?.severity).toBe('info');
  });
});
