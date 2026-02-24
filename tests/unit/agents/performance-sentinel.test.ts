import { describe, it, expect } from 'vitest';
import { performanceSentinelAgent } from '../../../src/agents/pro/performance-sentinel.js';
import { DEFAULT_CONFIG } from '../../../src/types/index.js';
import { createMockGraph, createMockPage, createMockComponent, createMockNode } from '../../helpers.js';

describe('Performance Sentinel Agent', () => {
  it('should flag page with too many imports', () => {
    const importCount = 25;
    const imports = Array.from({ length: importCount }, (_, i) => ({
      source: `lib/util${i}`,
      specifiers: [`util${i}`],
      isTypeOnly: false,
    }));

    const graph = createMockGraph({
      nodes: [
        [
          'app/heavy/page.tsx',
          createMockNode({
            id: 'app/heavy/page.tsx',
            type: 'page',
            imports,
          }),
        ],
      ],
      pages: [
        createMockPage({
          filePath: 'app/heavy/page.tsx',
          routePath: '/heavy',
        }),
      ],
    });

    const findings = performanceSentinelAgent.run(graph, DEFAULT_CONFIG);
    const heavyPage = findings.find((f) => f.title === 'Heavy page');

    expect(heavyPage).toBeDefined();
    expect(heavyPage?.severity).toBe('warning');
    expect(heavyPage?.message).toContain('25');
  });

  it('should NOT flag page with normal imports', () => {
    const imports = Array.from({ length: 5 }, (_, i) => ({
      source: `lib/util${i}`,
      specifiers: [`util${i}`],
      isTypeOnly: false,
    }));

    const graph = createMockGraph({
      nodes: [
        [
          'app/light/page.tsx',
          createMockNode({
            id: 'app/light/page.tsx',
            type: 'page',
            imports,
          }),
        ],
      ],
      pages: [
        createMockPage({
          filePath: 'app/light/page.tsx',
          routePath: '/light',
        }),
      ],
    });

    const findings = performanceSentinelAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should flag unnecessary client component (no hooks/state)', () => {
    const graph = createMockGraph({
      components: [
        createMockComponent({
          filePath: 'components/UnnecessaryClient.tsx',
          name: 'UnnecessaryClient',
          componentType: 'client',
          hooks: [],
          state: [],
          apiCalls: [],
          sideEffects: [],
        }),
        createMockComponent({
          filePath: 'components/NecessaryClient.tsx',
          name: 'NecessaryClient',
          componentType: 'client',
          hooks: ['useState'],
        }),
      ],
    });

    const findings = performanceSentinelAgent.run(graph, DEFAULT_CONFIG);
    const unnecessary = findings.find((f) => f.title === 'Unnecessary client component');

    expect(unnecessary).toBeDefined();
    expect(unnecessary?.message).toContain('UnnecessaryClient');
  });

  it('should NOT flag client component with hooks', () => {
    const graph = createMockGraph({
      components: [
        createMockComponent({
          filePath: 'components/WithHooks.tsx',
          name: 'WithHooks',
          componentType: 'client',
          hooks: ['useState', 'useEffect'],
        }),
      ],
    });

    const findings = performanceSentinelAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should NOT flag client component with state', () => {
    const graph = createMockGraph({
      components: [
        createMockComponent({
          filePath: 'components/WithState.tsx',
          name: 'WithState',
          componentType: 'client',
          state: [{ name: 'isOpen' }],
        }),
      ],
    });

    const findings = performanceSentinelAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should respect custom maxPageImports threshold', () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      agents: {
        thresholds: { maxPageImports: 50 },
      },
    };

    const imports = Array.from({ length: 25 }, (_, i) => ({
      source: `lib/util${i}`,
      specifiers: [`util${i}`],
      isTypeOnly: false,
    }));

    const graph = createMockGraph({
      nodes: [
        [
          'app/page.tsx',
          createMockNode({
            id: 'app/page.tsx',
            type: 'page',
            imports,
          }),
        ],
      ],
      pages: [
        createMockPage({
          filePath: 'app/page.tsx',
          routePath: '/',
        }),
      ],
    });

    const findings = performanceSentinelAgent.run(graph, customConfig);

    expect(findings).toHaveLength(0);
  });

  it('should flag page with API call waterfall', () => {
    const graph = createMockGraph({
      pages: [
        createMockPage({
          filePath: 'app/waterfall/page.tsx',
          routePath: '/waterfall',
          apiCalls: [
            { endpoint: '/api/users', method: 'GET' },
            { endpoint: '/api/posts', method: 'GET' },
            { endpoint: '/api/comments', method: 'GET' },
            { endpoint: '/api/likes', method: 'GET' },
            { endpoint: '/api/shares', method: 'GET' },
            { endpoint: '/api/tags', method: 'GET' },
          ],
        }),
      ],
    });

    const findings = performanceSentinelAgent.run(graph, DEFAULT_CONFIG);
    const waterfall = findings.find((f) => f.title === 'API call waterfall risk');

    expect(waterfall).toBeDefined();
    expect(waterfall?.severity).toBe('warning');
  });
});
