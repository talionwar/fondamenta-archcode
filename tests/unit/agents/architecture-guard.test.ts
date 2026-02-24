import { describe, it, expect } from 'vitest';
import { architectureGuardAgent } from '../../../src/agents/free/architecture-guard.js';
import { DEFAULT_CONFIG } from '../../../src/types/index.js';
import { createMockGraph, createMockNode, createMockApiRoute } from '../../helpers.js';

describe('Architecture Guard Agent', () => {
  it('should flag file over 500 lines', () => {
    const graph = createMockGraph({
      nodes: [
        [
          'components/LargeComponent.tsx',
          createMockNode({
            id: 'components/LargeComponent.tsx',
            type: 'component',
            lineCount: 600,
          }),
        ],
      ],
      components: [],
    });

    const findings = architectureGuardAgent.run(graph, DEFAULT_CONFIG);
    const oversized = findings.find((f) => f.title === 'Oversized file');

    expect(oversized).toBeDefined();
    expect(oversized?.severity).toBe('warning');
    expect(oversized?.message).toContain('600');
  });

  it('should NOT flag file under 500 lines', () => {
    const graph = createMockGraph({
      nodes: [
        [
          'components/SmallComponent.tsx',
          createMockNode({
            id: 'components/SmallComponent.tsx',
            type: 'component',
            lineCount: 300,
          }),
        ],
      ],
      components: [],
    });

    const findings = architectureGuardAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should flag unprotected mutation route with DB access', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/users/route.ts',
          routePath: '/api/users',
          methods: ['POST', 'DELETE'],
          auth: 'None',
          models: ['User', 'Post'],
        }),
      ],
    });

    const findings = architectureGuardAgent.run(graph, DEFAULT_CONFIG);
    const unprotected = findings.find((f) => f.title === 'Unprotected mutation route');

    expect(unprotected).toBeDefined();
    expect(unprotected?.severity).toBe('error');
    expect(unprotected?.message).toContain('without auth');
  });

  it('should NOT flag webhook routes', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/webhook/stripe/route.ts',
          routePath: '/api/webhook/stripe',
          methods: ['POST'],
          auth: 'None',
          models: ['Payment'],
        }),
      ],
    });

    const findings = architectureGuardAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should NOT flag cron routes', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/cron/cleanup/route.ts',
          routePath: '/api/cron/cleanup',
          methods: ['POST'],
          auth: 'None',
          models: ['Session'],
        }),
      ],
    });

    const findings = architectureGuardAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should NOT flag route with auth', () => {
    const graph = createMockGraph({
      apiRoutes: [
        createMockApiRoute({
          filePath: 'app/api/users/route.ts',
          routePath: '/api/users',
          methods: ['POST'],
          auth: 'auth()',
          models: ['User'],
        }),
      ],
    });

    const findings = architectureGuardAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should respect custom maxLineCount threshold', () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      agents: {
        thresholds: { maxLineCount: 1000 },
      },
    };

    const graph = createMockGraph({
      nodes: [
        [
          'components/BigComponent.tsx',
          createMockNode({
            id: 'components/BigComponent.tsx',
            type: 'component',
            lineCount: 800,
          }),
        ],
      ],
      components: [],
    });

    const findings = architectureGuardAgent.run(graph, customConfig);

    expect(findings).toHaveLength(0);
  });
});
