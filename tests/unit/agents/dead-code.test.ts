import { describe, it, expect } from 'vitest';
import { deadCodeAgent } from '../../../src/agents/free/dead-code.js';
import { DEFAULT_CONFIG } from '../../../src/types/index.js';
import {
  createMockGraph,
  createMockComponent,
  createMockLib,
  DEFAULT_CONFIG as TEST_DEFAULT_CONFIG,
} from '../../helpers.js';

describe('Dead Code Agent', () => {
  it('should flag orphan components with empty usedBy', () => {
    const graph = createMockGraph({
      components: [
        createMockComponent({
          filePath: 'components/OrphanWidget.tsx',
          name: 'OrphanWidget',
          usedBy: [],
        }),
        createMockComponent({
          filePath: 'components/Button.tsx',
          name: 'Button',
          usedBy: ['app/page.tsx'],
        }),
      ],
    });

    const findings = deadCodeAgent.run(graph, DEFAULT_CONFIG);
    const orphanFinding = findings.find((f) => f.filePath === 'components/OrphanWidget.tsx');

    expect(orphanFinding).toBeDefined();
    expect(orphanFinding?.severity).toBe('warning');
    expect(orphanFinding?.title).toContain('Orphan component');
  });

  it('should NOT flag layout.tsx (Next.js implicit)', () => {
    const graph = createMockGraph({
      components: [
        createMockComponent({
          filePath: 'app/layout.tsx',
          name: 'RootLayout',
          usedBy: [],
        }),
      ],
    });

    const findings = deadCodeAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should NOT flag loading.tsx (Next.js implicit)', () => {
    const graph = createMockGraph({
      components: [
        createMockComponent({
          filePath: 'app/loading.tsx',
          name: 'Loading',
          usedBy: [],
        }),
      ],
    });

    const findings = deadCodeAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should flag orphan lib with empty usedBy', () => {
    const graph = createMockGraph({
      libs: [
        createMockLib({
          filePath: 'lib/unused-util.ts',
          usedBy: [],
        }),
        createMockLib({
          filePath: 'lib/auth.ts',
          usedBy: ['app/api/users/route.ts'],
        }),
      ],
    });

    const findings = deadCodeAgent.run(graph, DEFAULT_CONFIG);
    const orphanLib = findings.find((f) => f.filePath === 'lib/unused-util.ts');

    expect(orphanLib).toBeDefined();
    expect(orphanLib?.severity).toBe('warning');
    expect(orphanLib?.title).toContain('Orphan lib');
  });

  it('should NOT flag lib with populated usedBy', () => {
    const graph = createMockGraph({
      libs: [
        createMockLib({
          filePath: 'lib/auth.ts',
          usedBy: ['app/api/users/route.ts', 'app/page.tsx'],
        }),
      ],
    });

    const findings = deadCodeAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should NOT flag page entries', () => {
    const graph = createMockGraph({
      pages: [
        {
          filePath: 'app/page.tsx',
          routePath: '/',
          componentType: 'server',
          auth: 'None',
          imports: [],
          dataFetching: [],
          components: [],
          apiCalls: [],
          params: [],
        },
      ],
    });

    const findings = deadCodeAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });

  it('should NOT flag index/barrel files', () => {
    const graph = createMockGraph({
      components: [
        createMockComponent({
          filePath: 'components/index.tsx',
          name: 'index',
          usedBy: [],
        }),
      ],
    });

    const findings = deadCodeAgent.run(graph, DEFAULT_CONFIG);

    expect(findings).toHaveLength(0);
  });
});
